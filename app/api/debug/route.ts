import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      return NextResponse.json({
        error: 'DATABASE_URL not found',
        env: Object.keys(process.env).filter(key => key.includes('DB') || key.includes('DATABASE'))
      });
    }

    // Test basic connection
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    // Check table structure if it exists
    let tableStructure = null;
    if (tableCheck.rows[0].exists) {
      const structureResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position;
      `);
      tableStructure = structureResult.rows;
    }

    client.release();
    await pool.end();

    return NextResponse.json({
      success: true,
      database_url_configured: !!dbUrl,
      connection_successful: true,
      current_time: result.rows[0].current_time,
      users_table_exists: tableCheck.rows[0].exists,
      table_structure: tableStructure,
      node_env: process.env.NODE_ENV
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      database_url_configured: !!process.env.DATABASE_URL
    }, { status: 500 });
  }
}