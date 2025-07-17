import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';

export async function POST() {
  try {
    console.log('🔧 Fixing outline_sessions table schema...');

    const fixes = [];

    // Check if columns exist and add them if missing
    try {
      // Check for step_id column
      const stepIdCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'outline_sessions' 
        AND column_name = 'step_id'
      `);

      if (stepIdCheck.rows.length === 0) {
        console.log('Adding missing step_id column...');
        await db.execute(sql`
          ALTER TABLE outline_sessions 
          ADD COLUMN step_id VARCHAR(100) NOT NULL DEFAULT 'deep-research'
        `);
        fixes.push('Added step_id column');
      }
    } catch (err) {
      console.error('Error checking/adding step_id:', err);
    }

    try {
      // Check for research_instructions column
      const researchCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'outline_sessions' 
        AND column_name = 'research_instructions'
      `);

      if (researchCheck.rows.length === 0) {
        console.log('Adding missing research_instructions column...');
        await db.execute(sql`
          ALTER TABLE outline_sessions 
          ADD COLUMN research_instructions TEXT
        `);
        fixes.push('Added research_instructions column');
      }
    } catch (err) {
      console.error('Error checking/adding research_instructions:', err);
    }

    // Fix NOT NULL constraints on timestamp columns
    try {
      console.log('Fixing timestamp column constraints...');
      
      // Make started_at NOT NULL with default
      await db.execute(sql`
        ALTER TABLE outline_sessions 
        ALTER COLUMN started_at SET NOT NULL,
        ALTER COLUMN started_at SET DEFAULT CURRENT_TIMESTAMP
      `);
      fixes.push('Fixed started_at constraints');
    } catch (err) {
      console.error('Error fixing started_at:', err);
    }

    try {
      // Make created_at NOT NULL with default
      await db.execute(sql`
        ALTER TABLE outline_sessions 
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
      `);
      fixes.push('Fixed created_at constraints');
    } catch (err) {
      console.error('Error fixing created_at:', err);
    }

    try {
      // Make updated_at NOT NULL with default
      await db.execute(sql`
        ALTER TABLE outline_sessions 
        ALTER COLUMN updated_at SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
      `);
      fixes.push('Fixed updated_at constraints');
    } catch (err) {
      console.error('Error fixing updated_at:', err);
    }

    // Verify the final structure
    const finalSchema = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'outline_sessions'
      ORDER BY ordinal_position
    `);

    console.log('✅ Schema fixes completed');

    return NextResponse.json({
      success: true,
      fixes,
      currentSchema: finalSchema.rows,
      message: 'Schema fixes applied successfully'
    });

  } catch (error: any) {
    console.error('❌ Schema fix error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}