import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString,
      ssl: false,
    });

    // Get the actual table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'workflows'
      ORDER BY ordinal_position;
    `);

    // Also check if the table exists at all
    const tableExists = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'workflows' AND table_schema = 'public';
    `);

    await pool.end();

    return NextResponse.json({
      tableExists: tableExists.rows.length > 0,
      columns: tableInfo.rows
    });

  } catch (error) {
    console.error('Check table structure error:', error);
    return NextResponse.json(
      { error: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}