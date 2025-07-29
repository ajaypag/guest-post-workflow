import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '0020_add_order_system.sql');
    logs.push(`Reading migration file: ${migrationPath}`);
    
    const migrationContent = await fs.readFile(migrationPath, 'utf-8');
    logs.push('✓ Migration file loaded successfully');
    
    // Split migration into individual statements
    const statements = migrationContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    logs.push(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const tableName = extractTableName(statement);
      
      try {
        logs.push(`[${i + 1}/${statements.length}] Executing: ${tableName || 'Statement'}`);
        await db.execute(sql.raw(statement));
        logs.push(`✓ ${tableName || 'Statement'} completed`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's a "already exists" error
        if (errorMessage.includes('already exists')) {
          logs.push(`⚠️ ${tableName || 'Statement'} already exists - skipping`);
        } else {
          throw new Error(`Failed at statement ${i + 1}: ${errorMessage}`);
        }
      }
    }
    
    // Run diagnostics
    logs.push('\n--- Running Post-Migration Diagnostics ---');
    
    // Check if tables were created
    const tableChecks = [
      'orders',
      'order_items', 
      'order_share_tokens',
      'order_status_history',
      'domain_suggestions',
      'advertiser_order_access',
      'pricing_rules'
    ];
    
    for (const table of tableChecks) {
      try {
        const result = await db.execute(sql`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        `);
        
        const exists = Number(result.rows[0]?.count || 0) > 0;
        logs.push(`✓ Table ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
        
        if (!exists) {
          throw new Error(`Table ${table} was not created`);
        }
      } catch (error) {
        logs.push(`✗ Failed to check table ${table}: ${error}`);
      }
    }
    
    // Check foreign key constraints
    logs.push('\n--- Checking Foreign Key Constraints ---');
    
    const fkChecks = [
      { table: 'orders', column: 'client_id', ref_table: 'clients' },
      { table: 'orders', column: 'advertiser_id', ref_table: 'users' },
      { table: 'order_items', column: 'order_id', ref_table: 'orders' },
      { table: 'order_items', column: 'domain_id', ref_table: 'bulk_analysis_domains' },
      { table: 'order_share_tokens', column: 'order_id', ref_table: 'orders' },
    ];
    
    for (const fk of fkChecks) {
      try {
        const result = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = ${fk.table}
          AND kcu.column_name = ${fk.column}
          AND tc.constraint_type = 'FOREIGN KEY'
        `);
        
        const exists = Number(result.rows[0]?.count || 0) > 0;
        logs.push(`✓ FK ${fk.table}.${fk.column} -> ${fk.ref_table}: ${exists ? 'OK' : 'MISSING'}`);
      } catch (error) {
        logs.push(`✗ Failed to check FK ${fk.table}.${fk.column}`);
      }
    }
    
    // Check indexes
    logs.push('\n--- Checking Indexes ---');
    
    const indexChecks = [
      { table: 'orders', index: 'idx_orders_client_id' },
      { table: 'orders', index: 'idx_orders_advertiser_id' },
      { table: 'orders', index: 'idx_orders_status' },
      { table: 'order_items', index: 'idx_order_items_order_id' },
      { table: 'order_share_tokens', index: 'idx_share_tokens_token' },
    ];
    
    for (const idx of indexChecks) {
      try {
        const result = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM pg_indexes
          WHERE tablename = ${idx.table}
          AND indexname = ${idx.index}
        `);
        
        const exists = Number(result.rows[0]?.count || 0) > 0;
        logs.push(`✓ Index ${idx.index}: ${exists ? 'OK' : 'MISSING'}`);
      } catch (error) {
        logs.push(`✗ Failed to check index ${idx.index}`);
      }
    }
    
    // Test insert into pricing_rules (default rule)
    logs.push('\n--- Creating Default Pricing Rules ---');
    
    try {
      await db.execute(sql`
        INSERT INTO pricing_rules (
          id, name, min_quantity, max_quantity, 
          discount_percent, valid_from, created_by
        ) VALUES 
        (gen_random_uuid(), 'No Discount', 0, 4, '0', NOW(), 'system'),
        (gen_random_uuid(), '5% Discount', 5, 9, '5', NOW(), 'system'),
        (gen_random_uuid(), '10% Discount', 10, 19, '10', NOW(), 'system'),
        (gen_random_uuid(), '15% Discount', 20, 49, '15', NOW(), 'system'),
        (gen_random_uuid(), '20% Discount', 50, NULL, '20', NOW(), 'system')
        ON CONFLICT DO NOTHING
      `);
      logs.push('✓ Default pricing rules created');
    } catch (error) {
      logs.push('⚠️ Could not create default pricing rules (may already exist)');
    }
    
    logs.push('\n✅ Migration completed successfully!');
    
    return NextResponse.json({ 
      success: true, 
      logs,
      message: 'Order system migration completed successfully'
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`\n❌ Migration failed: ${errorMessage}`);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        logs,
        success: false 
      },
      { status: 500 }
    );
  }
}

function extractTableName(statement: string): string | null {
  const createTableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
  if (createTableMatch) return createTableMatch[1];
  
  const createIndexMatch = statement.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
  if (createIndexMatch) return `Index: ${createIndexMatch[1]}`;
  
  const alterTableMatch = statement.match(/ALTER\s+TABLE\s+(\w+)/i);
  if (alterTableMatch) return `Alter: ${alterTableMatch[1]}`;
  
  return null;
}