import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

interface LogEntry {
  message: string;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const logs: LogEntry[] = [];
  
  const log = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    const entry = {
      message,
      level,
      timestamp: new Date().toISOString()
    };
    logs.push(entry);
    
    // Also log to server console (will show in Coolify logs)
    const logMessage = `[${entry.timestamp}] [MIGRATION] [${level.toUpperCase()}] ${message}`;
    if (level === 'error') {
      console.error(logMessage);
    } else if (level === 'warn') {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  };

  try {
    log('Unified order migration started');
    
    // Check session
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      log('Unauthorized access attempt', 'error');
      return NextResponse.json({ 
        error: 'Unauthorized - admin access required',
        logs 
      }, { status: 401 });
    }
    
    log(`Migration initiated by: ${session.email}`);

    // Start transaction
    log('Beginning database transaction');
    
    const migrationDetails = {
      tablesRenamed: 0,
      tablesCreated: 0,
      recordsMigrated: 0,
      columnsUpdated: 0,
    };

    try {
      // 1. Check if migration already applied
      log('Checking if migration already applied...');
      const checkResult = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'accounts'
        ) as accounts_exists,
        EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'order_groups'
        ) as order_groups_exists
      `);
      
      const migrationStatus = checkResult.rows[0] as any;
      log(`Accounts table exists: ${migrationStatus.accounts_exists}`);
      log(`Order groups table exists: ${migrationStatus.order_groups_exists}`);
      
      if (migrationStatus.accounts_exists || migrationStatus.order_groups_exists) {
        log('Migration appears to be already applied', 'warn');
        return NextResponse.json({ 
          error: 'Migration already applied',
          logs,
          details: { alreadyApplied: true }
        }, { status: 400 });
      }

      // Begin transaction
      await db.execute(sql`BEGIN`);
      log('Transaction started');

      // 2. Rename advertisers to accounts
      log('Step 1: Renaming advertisers table to accounts');
      await db.execute(sql`ALTER TABLE advertisers RENAME TO accounts`);
      migrationDetails.tablesRenamed++;
      log('✓ Table renamed: advertisers → accounts');

      // 3. Rename advertiser columns in orders table
      log('Step 2: Renaming advertiser columns in orders table');
      const orderColumnRenames = [
        { old: 'advertiser_id', new: 'account_id' },
        { old: 'advertiser_email', new: 'account_email' },
        { old: 'advertiser_name', new: 'account_name' },
        { old: 'advertiser_company', new: 'account_company' },
        { old: 'advertiser_notes', new: 'account_notes' }
      ];

      for (const rename of orderColumnRenames) {
        await db.execute(sql.raw(`ALTER TABLE orders RENAME COLUMN ${rename.old} TO ${rename.new}`));
        log(`✓ Column renamed: ${rename.old} → ${rename.new}`);
        migrationDetails.columnsUpdated++;
      }

      // 4. Add new columns to order_items
      log('Step 3: Adding new columns to order_items');
      await db.execute(sql`ALTER TABLE order_items ADD COLUMN order_group_id UUID`);
      await db.execute(sql`ALTER TABLE order_items ADD COLUMN site_selection_id UUID`);
      log('✓ Added order_group_id and site_selection_id to order_items');
      migrationDetails.columnsUpdated += 2;

      // 5. Create order_groups table
      log('Step 4: Creating order_groups table');
      await db.execute(sql`
        CREATE TABLE order_groups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          client_id UUID NOT NULL REFERENCES clients(id),
          link_count INTEGER NOT NULL,
          target_pages JSONB DEFAULT '[]'::jsonb,
          anchor_texts JSONB DEFAULT '[]'::jsonb,
          requirement_overrides JSONB DEFAULT '{}'::jsonb,
          bulk_analysis_project_id UUID REFERENCES bulk_analysis_projects(id),
          analysis_started_at TIMESTAMP,
          analysis_completed_at TIMESTAMP,
          group_status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      migrationDetails.tablesCreated++;
      log('✓ Created order_groups table');

      // Create indexes
      await db.execute(sql`CREATE INDEX idx_order_groups_order ON order_groups(order_id)`);
      await db.execute(sql`CREATE INDEX idx_order_groups_client ON order_groups(client_id)`);
      await db.execute(sql`CREATE INDEX idx_order_groups_analysis ON order_groups(bulk_analysis_project_id)`);
      log('✓ Created indexes for order_groups');

      // 6. Create order_site_selections table
      log('Step 5: Creating order_site_selections table');
      await db.execute(sql`
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
      migrationDetails.tablesCreated++;
      log('✓ Created order_site_selections table');

      // Create indexes
      await db.execute(sql`CREATE INDEX idx_selections_group ON order_site_selections(order_group_id)`);
      await db.execute(sql`CREATE INDEX idx_selections_status ON order_site_selections(status)`);
      await db.execute(sql`CREATE INDEX idx_selections_domain ON order_site_selections(domain_id)`);
      log('✓ Created indexes for order_site_selections');

      // 7. Update orders table
      log('Step 6: Updating orders table');
      await db.execute(sql`ALTER TABLE orders ADD COLUMN state VARCHAR(50) DEFAULT 'configuring'`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN requires_client_review BOOLEAN DEFAULT false`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN review_completed_at TIMESTAMP`);
      log('✓ Added state and review columns to orders');
      migrationDetails.columnsUpdated += 3;

      // 8. Migrate existing orders to use order_groups
      log('Step 7: Migrating existing orders to order_groups');
      const existingOrders = await db.execute(sql`
        SELECT o.id as order_id, o.client_id, COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.client_id IS NOT NULL
        GROUP BY o.id, o.client_id
      `);
      
      log(`Found ${existingOrders.rows.length} existing orders to migrate`);
      
      for (const order of existingOrders.rows) {
        const orderData = order as any;
        await db.execute(sql`
          INSERT INTO order_groups (order_id, client_id, link_count)
          VALUES (${orderData.order_id}, ${orderData.client_id}, ${orderData.item_count || 1})
        `);
        migrationDetails.recordsMigrated++;
      }
      log(`✓ Migrated ${migrationDetails.recordsMigrated} orders to order_groups`);

      // 9. Link existing order_items to their default group
      log('Step 8: Linking order_items to order_groups');
      await db.execute(sql`
        UPDATE order_items oi
        SET order_group_id = og.id
        FROM order_groups og
        WHERE og.order_id = oi.order_id
      `);
      log('✓ Linked order_items to their order_groups');

      // 10. Drop client_id from orders
      log('Step 9: Removing client_id from orders table');
      await db.execute(sql`ALTER TABLE orders DROP COLUMN client_id`);
      log('✓ Removed client_id from orders');
      migrationDetails.columnsUpdated++;

      // 11. Rename other tables with advertiser references
      log('Step 10: Renaming advertiser_order_access table');
      
      // First check if the table exists and what columns it has
      const tableCheckResult = await db.execute(sql`
        SELECT 
          EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'advertiser_order_access'
          ) as table_exists,
          EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'advertiser_order_access'
            AND column_name = 'advertiser_id'
          ) as has_advertiser_id,
          EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'advertiser_order_access'
            AND column_name = 'account_id'
          ) as has_account_id
      `);
      
      const checkResult = tableCheckResult.rows[0] as any;
      log(`Table advertiser_order_access exists: ${checkResult.table_exists}`);
      log(`Has advertiser_id column: ${checkResult.has_advertiser_id}`);
      log(`Has account_id column: ${checkResult.has_account_id}`);
      
      if (checkResult.table_exists) {
        // Only rename column if it exists and hasn't been renamed yet
        if (checkResult.has_advertiser_id && !checkResult.has_account_id) {
          try {
            await db.execute(sql`ALTER TABLE advertiser_order_access RENAME COLUMN advertiser_id TO account_id`);
            log('✓ Column renamed: advertiser_id → account_id in advertiser_order_access');
          } catch (colError: any) {
            log(`Failed to rename column: ${colError.message}`, 'error');
            throw colError;
          }
        } else if (checkResult.has_account_id) {
          log('⚠️ Column already renamed to account_id - skipping column rename', 'warn');
        }
        
        // Now rename the table
        try {
          await db.execute(sql`ALTER TABLE advertiser_order_access RENAME TO account_order_access`);
          migrationDetails.tablesRenamed++;
          log('✓ Table renamed: advertiser_order_access → account_order_access');
        } catch (tableError: any) {
          log(`Failed to rename table: ${tableError.message}`, 'error');
          throw tableError;
        }
      } else {
        // Check if it was already renamed
        const renamedCheckResult = await db.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'account_order_access'
          ) as already_renamed
        `);
        
        if ((renamedCheckResult.rows[0] as any).already_renamed) {
          log('⚠️ Table already renamed to account_order_access - skipping', 'warn');
        } else {
          log('⚠️ Neither advertiser_order_access nor account_order_access table found', 'warn');
        }
      }

      // 12. Update domain_suggestions table
      log('Step 11: Updating domain_suggestions table');
      
      // Check if domain_suggestions table exists
      const domainSuggestionsExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'domain_suggestions'
        ) as table_exists
      `);
      
      if ((domainSuggestionsExists.rows[0] as any).table_exists) {
        const suggestionRenames = [
          { old: 'advertiser_id', new: 'account_id' },
          { old: 'advertiser_email', new: 'account_email' },
          { old: 'advertiser_notes', new: 'account_notes' }
        ];

        for (const rename of suggestionRenames) {
          // Check if column exists and hasn't been renamed
          const columnCheck = await db.execute(sql`
            SELECT 
              EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'domain_suggestions'
                AND column_name = ${rename.old}
              ) as has_old_column,
              EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'domain_suggestions'
                AND column_name = ${rename.new}
              ) as has_new_column
          `);
          
          const colCheckResult = columnCheck.rows[0] as any;
          
          if (colCheckResult.has_old_column && !colCheckResult.has_new_column) {
            await db.execute(sql.raw(`ALTER TABLE domain_suggestions RENAME COLUMN ${rename.old} TO ${rename.new}`));
            log(`✓ Column renamed in domain_suggestions: ${rename.old} → ${rename.new}`);
            migrationDetails.columnsUpdated++;
          } else if (colCheckResult.has_new_column) {
            log(`⚠️ Column ${rename.new} already exists in domain_suggestions - skipping`, 'warn');
          } else if (!colCheckResult.has_old_column) {
            log(`⚠️ Column ${rename.old} not found in domain_suggestions - skipping`, 'warn');
          }
        }
      } else {
        log('⚠️ domain_suggestions table not found - skipping column renames', 'warn');
      }

      // 13. Add foreign key constraints
      log('Step 12: Adding foreign key constraints');
      await db.execute(sql`
        ALTER TABLE order_items 
        ADD CONSTRAINT fk_order_items_group 
        FOREIGN KEY (order_group_id) 
        REFERENCES order_groups(id)
      `);
      
      await db.execute(sql`
        ALTER TABLE order_items 
        ADD CONSTRAINT fk_order_items_selection 
        FOREIGN KEY (site_selection_id) 
        REFERENCES order_site_selections(id)
      `);
      log('✓ Added foreign key constraints');

      // 14. Create helper view
      log('Step 13: Creating order_summary view');
      await db.execute(sql`
        CREATE VIEW order_summary AS
        SELECT 
          o.id,
          o.account_id,
          o.state,
          o.status,
          o.total_retail,
          COUNT(DISTINCT og.id) as client_count,
          SUM(og.link_count) as total_links,
          COUNT(DISTINCT oss.id) FILTER (WHERE oss.status = 'approved') as approved_sites,
          o.created_at,
          o.updated_at
        FROM orders o
        LEFT JOIN order_groups og ON og.order_id = o.id
        LEFT JOIN order_site_selections oss ON oss.order_group_id = og.id
        GROUP BY o.id
      `);
      log('✓ Created order_summary view');

      // Commit transaction
      await db.execute(sql`COMMIT`);
      log('Transaction committed successfully', 'info');
      log('🎉 Migration completed successfully!', 'info');

      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        logs,
        details: migrationDetails
      });

    } catch (error: any) {
      // Rollback on error
      log('Error occurred, rolling back transaction', 'error');
      await db.execute(sql`ROLLBACK`);
      throw error;
    }

  } catch (error: any) {
    log(`Migration failed: ${error.message}`, 'error');
    log(`Error stack: ${error.stack}`, 'error');
    
    return NextResponse.json({
      error: error.message,
      logs,
      stack: error.stack
    }, { status: 500 });
  }
}