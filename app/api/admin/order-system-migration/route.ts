import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check current state before migration
    const diagnostics = {
      tables: {} as Record<string, boolean>,
      columns: {} as Record<string, string[]>,
      indexes: {} as Record<string, string[]>
    };
    
    // Check tables
    const tablesCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('orders', 'order_groups', 'order_site_selections', 'order_share_tokens', 'order_items', 'clients', 'bulk_analysis_projects', 'bulk_analysis_domains')
    `);
    
    tablesCheck.rows.forEach((row: any) => {
      diagnostics.tables[row.table_name] = true;
    });
    
    // Check columns for orders table
    if (diagnostics.tables['orders']) {
      const ordersColumns = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders'
        ORDER BY ordinal_position
      `);
      diagnostics.columns['orders'] = ordersColumns.rows.map((r: any) => `${r.column_name} (${r.data_type})`);
    }
    
    // Check columns for order_items table
    if (diagnostics.tables['order_items']) {
      const orderItemsColumns = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'order_items'
        ORDER BY ordinal_position
      `);
      diagnostics.columns['order_items'] = orderItemsColumns.rows.map((r: any) => `${r.column_name} (${r.data_type})`);
    }
    
    // Check columns for clients table
    if (diagnostics.tables['clients']) {
      const clientsColumns = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'clients'
        ORDER BY ordinal_position
      `);
      diagnostics.columns['clients'] = clientsColumns.rows.map((r: any) => `${r.column_name} (${r.data_type})`);
    }
    
    // Check indexes
    const indexesCheck = await db.execute(sql`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('order_groups', 'order_site_selections')
    `);
    
    indexesCheck.rows.forEach((row: any) => {
      if (!diagnostics.indexes[row.tablename]) {
        diagnostics.indexes[row.tablename] = [];
      }
      diagnostics.indexes[row.tablename].push(row.indexname);
    });
    
    return NextResponse.json({
      success: true,
      diagnostics,
      readyToMigrate: {
        ordersTableExists: !!diagnostics.tables['orders'],
        orderItemsTableExists: !!diagnostics.tables['order_items'],
        clientsTableExists: !!diagnostics.tables['clients'],
        bulkAnalysisTablesExist: !!diagnostics.tables['bulk_analysis_projects'] && !!diagnostics.tables['bulk_analysis_domains'],
        orderGroupsAlreadyExists: !!diagnostics.tables['order_groups'],
        orderSiteSelectionsAlreadyExists: !!diagnostics.tables['order_site_selections']
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST() {
  console.log('Starting order system migration...');
  
  const migrationLog: string[] = [];
  const errors: string[] = [];
  
  const log = (message: string) => {
    console.log(message);
    migrationLog.push(`[${new Date().toISOString()}] ${message}`);
  };
  
  const logError = (message: string, error?: any) => {
    console.error(message, error);
    errors.push(`[${new Date().toISOString()}] ${message}: ${error?.message || error}`);
  };
  
  try {
    // Start a transaction
    await db.transaction(async (tx) => {
      // 1. Add new columns to orders table
      log('Step 1: Updating orders table...');
      
      try {
        // Check if state column exists
        const stateCheck = await tx.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'state'
        `);
        
        log(`Found ${stateCheck.rows.length} existing 'state' columns`);
        
        if (stateCheck.rows.length === 0) {
          log('Adding new columns to orders table...');
          await tx.execute(sql`
            ALTER TABLE orders 
            ADD COLUMN state VARCHAR(50) DEFAULT 'configuring',
            ADD COLUMN requires_client_review BOOLEAN DEFAULT false,
            ADD COLUMN review_completed_at TIMESTAMP
          `);
          log('Successfully added columns to orders table');
        } else {
          log('State column already exists, skipping orders table update');
        }
      } catch (error) {
        logError('Failed to update orders table', error);
        throw error;
      }
      
      // 2. Create order_groups table
      log('\nStep 2: Creating order_groups table...');
      try {
        const orderGroupsCheck = await tx.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'order_groups'
          )
        `);
        
        const exists = (orderGroupsCheck.rows[0] as any).exists;
        log(`order_groups table exists: ${exists}`);
        
        if (!exists) {
          log('Creating order_groups table...');
          await tx.execute(sql`
            CREATE TABLE order_groups (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
              client_id UUID NOT NULL REFERENCES clients(id),
              link_count INTEGER NOT NULL,
              target_pages JSONB DEFAULT '[]',
              anchor_texts JSONB DEFAULT '[]',
              requirement_overrides JSONB DEFAULT '{}',
              bulk_analysis_project_id UUID REFERENCES bulk_analysis_projects(id),
              analysis_started_at TIMESTAMP,
              analysis_completed_at TIMESTAMP,
              group_status VARCHAR(50) DEFAULT 'pending',
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);
          log('Table created successfully');
          
          // Create indexes
          log('Creating indexes for order_groups...');
          await tx.execute(sql`CREATE INDEX idx_order_groups_order ON order_groups(order_id)`);
          await tx.execute(sql`CREATE INDEX idx_order_groups_client ON order_groups(client_id)`);
          await tx.execute(sql`CREATE INDEX idx_order_groups_analysis ON order_groups(bulk_analysis_project_id)`);
          log('Indexes created successfully');
        } else {
          log('order_groups table already exists, skipping');
        }
      } catch (error) {
        logError('Failed to create order_groups table', error);
        throw error;
      }
      
      // 3. Create order_site_selections table
      log('\nStep 3: Creating order_site_selections table...');
      try {
        const siteSelectionsCheck = await tx.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'order_site_selections'
          )
        `);
        
        const exists = (siteSelectionsCheck.rows[0] as any).exists;
        log(`order_site_selections table exists: ${exists}`);
        
        if (!exists) {
          log('Creating order_site_selections table...');
          await tx.execute(sql`
            CREATE TABLE order_site_selections (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
              domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id),
              status VARCHAR(50) NOT NULL DEFAULT 'suggested',
              target_page_url TEXT,
              anchor_text VARCHAR(255),
              reviewed_at TIMESTAMP,
              reviewed_by UUID REFERENCES users(id),
              client_notes TEXT,
              internal_notes TEXT,
              order_item_id UUID REFERENCES order_items(id),
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);
          log('Table created successfully');
          
          // Create indexes
          log('Creating indexes for order_site_selections...');
          await tx.execute(sql`CREATE INDEX idx_selections_group ON order_site_selections(order_group_id)`);
          await tx.execute(sql`CREATE INDEX idx_selections_status ON order_site_selections(status)`);
          await tx.execute(sql`CREATE INDEX idx_selections_domain ON order_site_selections(domain_id)`);
          log('Indexes created successfully');
        } else {
          log('order_site_selections table already exists, skipping');
        }
      } catch (error) {
        logError('Failed to create order_site_selections table', error);
        throw error;
      }
      
      // 4. Update order_share_tokens if needed (it already exists)
      log('\nStep 4: Checking order_share_tokens table...');
      try {
        const shareTokensCheck = await tx.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'order_share_tokens'
          ORDER BY ordinal_position
        `);
        
        log(`order_share_tokens has ${shareTokensCheck.rows.length} columns`);
        if (shareTokensCheck.rows.length > 0) {
          log('order_share_tokens table already exists with columns: ' + 
            shareTokensCheck.rows.map((r: any) => r.column_name).join(', '));
        } else {
          log('order_share_tokens table not found (might need separate migration)');
        }
      } catch (error) {
        logError('Failed to check order_share_tokens table', error);
        // Don't throw - this is not critical
      }
      
      // 5. Add columns to order_items for linkage
      log('\nStep 5: Updating order_items table...');
      try {
        const orderItemsCheck = await tx.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'order_items' 
          AND column_name IN ('order_group_id', 'site_selection_id')
        `);
        
        const existingColumns = orderItemsCheck.rows.map((r: any) => r.column_name);
        log(`Existing linkage columns: ${existingColumns.join(', ') || 'none'}`);
        
        if (!existingColumns.includes('order_group_id')) {
          log('Adding order_group_id and site_selection_id columns...');
          await tx.execute(sql`
            ALTER TABLE order_items 
            ADD COLUMN order_group_id UUID,
            ADD COLUMN site_selection_id UUID
          `);
          log('Columns added successfully');
        } else {
          log('Linkage columns already exist, skipping');
        }
      } catch (error) {
        logError('Failed to update order_items table', error);
        throw error;
      }
      
      // 6. Add default requirements to clients table
      log('\nStep 6: Updating clients table...');
      try {
        const clientsCheck = await tx.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'clients' AND column_name = 'default_requirements'
        `);
        
        log(`Found ${clientsCheck.rows.length} default_requirements columns`);
        
        if (clientsCheck.rows.length === 0) {
          log('Adding default_requirements column...');
          await tx.execute(sql`
            ALTER TABLE clients 
            ADD COLUMN default_requirements JSONB DEFAULT '{}'
          `);
          log('Column added successfully');
        } else {
          log('default_requirements column already exists, skipping');
        }
      } catch (error) {
        logError('Failed to update clients table', error);
        throw error;
      }
      
      log('\n✅ Order system migration completed successfully!');
    });
    
    // Get summary of changes
    const summary = {
      tables_created: [] as string[],
      columns_added: [] as string[],
      indexes_created: [] as string[]
    };
    
    // Check what was created
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('order_groups', 'order_site_selections')
      AND table_schema = 'public'
    `);
    
    summary.tables_created = tablesResult.rows.map((r: any) => r.table_name);
    
    return NextResponse.json({
      success: true,
      message: 'Order system migration completed successfully',
      summary,
      migrationLog,
      errors
    });
    
  } catch (error) {
    logError('Migration failed', error);
    
    // Get current state for debugging
    let currentState = {};
    try {
      const tablesCheck = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('order_groups', 'order_site_selections')
        AND table_schema = 'public'
      `);
      
      const ordersColumnsCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name IN ('state', 'requires_client_review', 'review_completed_at')
      `);
      
      currentState = {
        existingTables: tablesCheck.rows.map((r: any) => r.table_name),
        ordersColumns: ordersColumnsCheck.rows.map((r: any) => r.column_name)
      };
    } catch (e) {
      logError('Failed to get current state', e);
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      migrationLog,
      errors,
      currentState,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}