import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check the actual columns in the workflow_steps table
    const columnsQuery = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'workflow_steps'
      ORDER BY ordinal_position
    `);

    // Try a simple query to see what works
    let testQuery = null;
    let testError = null;
    
    try {
      // Try the most basic query possible
      testQuery = await db.execute(sql`
        SELECT * FROM workflow_steps LIMIT 1
      `);
    } catch (error: any) {
      testError = error.message;
    }

    // Check if the table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'workflow_steps'
      )
    `);

    return NextResponse.json({
      tableExists: tableExists.rows[0]?.exists || false,
      columns: columnsQuery.rows,
      sampleData: testQuery?.rows?.[0] || null,
      testError,
      recommendation: columnsQuery.rows.find((col: any) => col.column_name === 'step_number') 
        ? 'Column step_number exists in database'
        : 'Column step_number does NOT exist - database schema mismatch'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Schema check failed', 
      details: error.message 
    }, { status: 500 });
  }
}