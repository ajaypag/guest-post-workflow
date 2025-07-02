import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET() {
  try {
    // Check if drizzle migrations table exists
    const migrationTableCheck = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      ) as migration_table_exists;
    `);
    
    // If migration table exists, check migration status
    let migrationStatus = null;
    try {
      migrationStatus = await db.execute(`
        SELECT * FROM __drizzle_migrations ORDER BY created_at DESC;
      `);
    } catch (error) {
      // Migration table might not exist yet
      migrationStatus = { error: 'Migration table not found' };
    }
    
    // Check all expected tables
    const expectedTables = ['users', 'clients', 'workflows', 'workflow_steps', 'target_pages', 'client_assignments'];
    const tableChecks = {};
    
    for (const tableName of expectedTables) {
      try {
        const result = await db.execute(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
          ) as table_exists;
        `);
        tableChecks[tableName] = result[0]?.table_exists || false;
      } catch (error) {
        tableChecks[tableName] = { error: error.message };
      }
    }
    
    return NextResponse.json({
      migrationTableExists: migrationTableCheck[0]?.migration_table_exists || false,
      migrationStatus,
      tableChecks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Migration debug error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}