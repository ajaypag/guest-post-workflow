import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

/**
 * CRITICAL FIX: Polish sections database column issues
 * 
 * Fixes the "Failed query: insert into polish_sections" error by:
 * 1. Expanding VARCHAR columns to TEXT for AI-generated content
 * 2. Changing score columns to REAL to accept decimals (8.5, 9.0, etc.)
 * 
 * This addresses the CLAUDE.md diagnostic protocol for VARCHAR size limits.
 */
export async function POST() {
  try {
    console.log('🔧 Starting Polish database columns fix...');
    
    // Check current column sizes first
    console.log('📊 Checking current column sizes...');
    const currentCols = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_name = 'polish_sections' 
      AND column_name IN ('polish_approach', 'title', 'strengths', 'weaknesses', 'brand_conflicts', 'engagement_score', 'clarity_score')
      ORDER BY column_name
    `);

    console.log('Current column structure:', currentCols);

    // Apply fixes in a transaction
    await db.execute(sql`BEGIN`);
    
    try {
      // 1. Fix polish_approach to TEXT (main culprit for long AI descriptions)
      console.log('🔄 Fixing polish_approach column...');
      await db.execute(sql`
        ALTER TABLE polish_sections 
        ALTER COLUMN polish_approach TYPE TEXT
      `);
      
      // 2. Ensure title can handle long titles  
      console.log('🔄 Fixing title column...');
      await db.execute(sql`
        ALTER TABLE polish_sections 
        ALTER COLUMN title TYPE VARCHAR(500)
      `);
      
      // 3. Ensure all text content columns are TEXT
      console.log('🔄 Fixing text content columns...');
      await db.execute(sql`
        ALTER TABLE polish_sections 
        ALTER COLUMN strengths TYPE TEXT
      `);
      
      await db.execute(sql`
        ALTER TABLE polish_sections 
        ALTER COLUMN weaknesses TYPE TEXT
      `);
      
      await db.execute(sql`
        ALTER TABLE polish_sections 
        ALTER COLUMN brand_conflicts TYPE TEXT
      `);
      
      // 4. Fix score columns to accept decimals (8.5, 9.0, etc.)
      console.log('🔄 Fixing score columns for decimal support...');
      await db.execute(sql`
        ALTER TABLE polish_sections 
        ALTER COLUMN engagement_score TYPE REAL
      `);
      
      await db.execute(sql`
        ALTER TABLE polish_sections 
        ALTER COLUMN clarity_score TYPE REAL
      `);

      // Commit the transaction
      await db.execute(sql`COMMIT`);
      console.log('✅ All column alterations committed successfully');

      // Verify the fixes
      console.log('📊 Verifying fixes...');
      const updatedCols = await db.execute(sql`
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_name = 'polish_sections' 
        AND column_name IN ('polish_approach', 'title', 'strengths', 'weaknesses', 'brand_conflicts', 'engagement_score', 'clarity_score')
        ORDER BY column_name
      `);

      console.log('Updated column structure:', updatedCols);

      return NextResponse.json({
        success: true,
        message: 'Polish database columns successfully fixed',
        fixes_applied: [
          'polish_approach: TEXT (supports any length AI content)',
          'title: VARCHAR(500) (handles long titles)',
          'strengths: TEXT (unlimited AI content)',
          'weaknesses: TEXT (unlimited AI content)', 
          'brand_conflicts: TEXT (unlimited AI content)',
          'engagement_score: REAL (accepts decimals like 8.5)',
          'clarity_score: REAL (accepts decimals like 9.0)'
        ],
        before: currentCols,
        after: updatedCols,
        note: 'Polish agent should now be able to save content without column size errors'
      });

    } catch (error) {
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
    
  } catch (error: any) {
    console.error('❌ Error fixing Polish database columns:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      suggestion: 'Check database connection and permissions. The Polish agent will continue to fail until these column sizes are fixed.'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Just check current column status without making changes
    const currentCols = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_name = 'polish_sections' 
      AND column_name IN ('polish_approach', 'title', 'strengths', 'weaknesses', 'brand_conflicts', 'engagement_score', 'clarity_score')
      ORDER BY column_name
    `);

    // Analyze if fixes are needed
    const issues = [];
    for (const col of currentCols.rows || currentCols) {
      const row = col as any;
      if (row.column_name === 'polish_approach' && row.data_type === 'character varying' && row.character_maximum_length < 255) {
        issues.push(`${row.column_name}: ${row.data_type}(${row.character_maximum_length}) - TOO SMALL for AI content`);
      }
      if (row.column_name.includes('score') && row.data_type === 'integer') {
        issues.push(`${row.column_name}: ${row.data_type} - Cannot accept decimal scores like 8.5`);
      }
    }

    return NextResponse.json({
      current_columns: currentCols,
      issues_found: issues,
      fix_needed: issues.length > 0,
      fix_endpoint: 'POST /api/admin/fix-polish-database-columns'
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      suggestion: 'Database connection issue. Check DATABASE_URL environment variable.'
    }, { status: 500 });
  }
}