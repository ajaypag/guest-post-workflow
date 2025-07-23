import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Check if table exists and get its structure
    const tableInfo = await db.execute(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'link_orchestration_sessions'
      ORDER BY ordinal_position
    `);

    // Get current row count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM link_orchestration_sessions
    `);

    // Check schema definition in code
    const schemaCheck = await db.execute(sql`
      SELECT 
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_name = 'link_orchestration_sessions'
      AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `);

    return NextResponse.json({
      success: true,
      tableExists: tableInfo.rows.length > 0,
      columnCount: tableInfo.rows.length,
      columns: tableInfo.rows,
      rowCount: countResult.rows[0]?.count || 0,
      schemaDetails: schemaCheck.rows,
      debugInfo: {
        message: 'Use this information to debug the insert query mismatch',
        hint: 'Check if all columns in the insert query exist in the table'
      }
    });
  } catch (error: any) {
    console.error('Schema check error:', error);
    
    // Try to get more specific error information
    let errorDetails = {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    };

    return NextResponse.json({
      success: false,
      error: 'Failed to check schema',
      details: errorDetails,
      rawError: error.toString()
    }, { status: 500 });
  }
}