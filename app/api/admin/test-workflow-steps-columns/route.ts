import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Check what columns exist in workflow_steps
    const columnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'workflow_steps'
      ORDER BY ordinal_position
    `);
    
    const columns = columnsResult.rows.map((row: any) => row.column_name);
    
    // 2. Try a raw SQL query to see actual data
    let rawQueryResult = null;
    let rawQueryError = null;
    
    try {
      rawQueryResult = await db.execute(sql`
        SELECT * FROM workflow_steps LIMIT 1
      `);
    } catch (error: any) {
      rawQueryError = error.message;
    }
    
    // 3. Check if we have stepNumber or step_number
    const hasStepNumber = columns.includes('step_number');
    const hasStepNumberCamel = columns.includes('stepNumber');
    
    return NextResponse.json({
      success: true,
      tableColumns: columns,
      hasStepNumber,
      hasStepNumberCamel,
      sampleRow: rawQueryResult?.rows?.[0] || null,
      rawQueryError,
      diagnosis: {
        issue: !hasStepNumber && !hasStepNumberCamel 
          ? 'Neither step_number nor stepNumber column exists!' 
          : 'Columns exist but query is failing',
        recommendation: !hasStepNumber 
          ? 'Database is missing step_number column - may need migration'
          : 'Column exists - issue is with Drizzle query generation'
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}