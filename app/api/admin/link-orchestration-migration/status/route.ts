import { NextResponse } from 'next/server';
import pool from '@/lib/db/connection';

export async function GET() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'link_orchestration_sessions'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (tableExists) {
      // Get table info
      const columnInfo = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'link_orchestration_sessions'
        ORDER BY ordinal_position;
      `);
      
      const indexInfo = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'link_orchestration_sessions';
      `);
      
      return NextResponse.json({
        tableExists: true,
        columns: columnInfo.rows,
        indexes: indexInfo.rows,
        message: 'Table exists and is ready to use'
      });
    }
    
    return NextResponse.json({
      tableExists: false,
      message: 'Table does not exist - migration needed'
    });
    
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}