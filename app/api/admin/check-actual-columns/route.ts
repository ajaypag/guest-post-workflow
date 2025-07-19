import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check actual column names in workflow_steps table
    const columnsResult = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'workflow_steps'
      ORDER BY ordinal_position
    `);
    
    const columns = columnsResult.rows;
    
    // Get a sample row to see actual data
    let sampleRow = null;
    try {
      const sampleResult = await db.execute(sql`
        SELECT * FROM workflow_steps LIMIT 1
      `);
      sampleRow = sampleResult.rows[0];
    } catch (error) {
      console.error('Failed to get sample row:', error);
    }
    
    // Check for column name mismatches
    const schemaExpects = {
      stepNumber: 'step_number',
      workflowId: 'workflow_id',
      completedAt: 'completed_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
    
    const mismatches: string[] = [];
    const columnNames = columns.map((c: any) => c.column_name);
    
    for (const [camelCase, snakeCase] of Object.entries(schemaExpects)) {
      if (!columnNames.includes(snakeCase)) {
        mismatches.push(`Expected column '${snakeCase}' (for ${camelCase}) not found`);
      }
    }
    
    // Check if step_number exists
    const hasStepNumber = columnNames.includes('step_number');
    const hasStepNumberColumn = columnNames.includes('stepNumber');
    
    return NextResponse.json({
      success: true,
      table: 'workflow_steps',
      columns: columns.map((c: any) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable,
        default: c.column_default
      })),
      columnNames,
      hasStepNumber,
      hasStepNumberColumn,
      mismatches,
      sampleRow,
      diagnosis: {
        stepNumberIssue: !hasStepNumber ? 
          'CRITICAL: step_number column does not exist!' : 
          'step_number column exists',
        recommendation: !hasStepNumber ? 
          'Database needs migration to add step_number column' : 
          'Column exists - issue is with query generation'
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message,
      hint: 'Failed to check column names'
    }, { status: 500 });
  }
}