import { NextResponse } from 'next/server';
import pool from '@/lib/db/connection';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'migrations', 'add_link_orchestration_sessions.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    // Verify the table was created
    const verification = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_name = 'link_orchestration_sessions') as table_count,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'link_orchestration_sessions') as column_count,
        (SELECT COUNT(*) FROM pg_indexes 
         WHERE tablename = 'link_orchestration_sessions') as index_count;
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      verification: verification.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}