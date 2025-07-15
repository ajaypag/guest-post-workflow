import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Checking audit_sessions table columns...');
    
    // First check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_sessions'
      ) as exists
    `);

    const exists = (tableExists as any)[0]?.exists === true;
    
    if (!exists) {
      return NextResponse.json({
        success: true,
        tableExists: false,
        message: 'audit_sessions table does not exist',
        timestamp: new Date().toISOString()
      });
    }

    // Get all columns for audit_sessions
    const columnsResult = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_name = 'audit_sessions'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    // Check for specific final polish columns
    const finalPolishColumns = [
      'audit_type',
      'total_proceed_steps', 
      'completed_proceed_steps',
      'total_cleanup_steps',
      'completed_cleanup_steps',
      'original_article',
      'research_outline'
    ];

    const columnMap = new Map();
    (columnsResult as unknown as any[]).forEach(col => {
      columnMap.set(col.column_name, col);
    });

    const finalPolishStatus = finalPolishColumns.map(colName => ({
      columnName: colName,
      exists: columnMap.has(colName),
      details: columnMap.get(colName) || null
    }));

    const columnsArray = columnsResult as unknown as any[];
    console.log('audit_sessions columns checked, found:', columnsArray.length);

    return NextResponse.json({
      success: true,
      tableExists: true,
      totalColumns: columnsArray.length,
      columns: columnsResult,
      finalPolishColumns: finalPolishStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking audit_sessions columns:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : error
    }, { status: 500 });
  }
}