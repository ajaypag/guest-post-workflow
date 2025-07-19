import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // First check if column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'workflow_steps' 
      AND column_name = 'step_number'
    `);
    
    if (checkResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Column step_number already exists'
      });
    }
    
    // Add the step_number column
    await db.execute(sql`
      ALTER TABLE workflow_steps 
      ADD COLUMN step_number INTEGER NOT NULL DEFAULT 0
    `);
    
    // Update existing rows to have sequential step numbers
    await db.execute(sql`
      WITH numbered_steps AS (
        SELECT 
          id,
          ROW_NUMBER() OVER (PARTITION BY workflow_id ORDER BY created_at) - 1 as step_num
        FROM workflow_steps
      )
      UPDATE workflow_steps
      SET step_number = numbered_steps.step_num
      FROM numbered_steps
      WHERE workflow_steps.id = numbered_steps.id
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully added step_number column and populated values'
    });
    
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message,
      detail: error.detail || 'Migration failed'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check current state
    const columnsResult = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'workflow_steps'
      AND column_name IN ('step_number', 'stepNumber')
    `);
    
    const hasStepNumber = columnsResult.rows.some((r: any) => r.column_name === 'step_number');
    const hasStepNumberCamel = columnsResult.rows.some((r: any) => r.column_name === 'stepNumber');
    
    return NextResponse.json({
      success: true,
      hasStepNumber,
      hasStepNumberCamel,
      columns: columnsResult.rows,
      needsMigration: !hasStepNumber && !hasStepNumberCamel,
      message: hasStepNumber ? 
        'Column step_number exists' : 
        'Column step_number is missing - run migration'
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message
    }, { status: 500 });
  }
}