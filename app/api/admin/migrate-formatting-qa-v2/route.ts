import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Starting formatting QA v2 migration - adding cleaned_article and fixes_applied columns...');
    
    // Start transaction
    await db.execute(sql`BEGIN`);
    
    try {
      // Check if cleaned_article column exists
      const cleanedArticleCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'formatting_qa_sessions' 
        AND column_name = 'cleaned_article'
      `);
      
      const cleanedArticleRows = (cleanedArticleCheck as any).rows || cleanedArticleCheck;
      const cleanedArticleExists = Array.isArray(cleanedArticleRows) && cleanedArticleRows.length > 0;
      
      if (!cleanedArticleExists) {
        console.log('Adding cleaned_article column...');
        await db.execute(sql`
          ALTER TABLE "formatting_qa_sessions" 
          ADD COLUMN "cleaned_article" text
        `);
      } else {
        console.log('cleaned_article column already exists');
      }
      
      // Check if fixes_applied column exists
      const fixesAppliedCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'formatting_qa_sessions' 
        AND column_name = 'fixes_applied'
      `);
      
      const fixesAppliedRows = (fixesAppliedCheck as any).rows || fixesAppliedCheck;
      const fixesAppliedExists = Array.isArray(fixesAppliedRows) && fixesAppliedRows.length > 0;
      
      if (!fixesAppliedExists) {
        console.log('Adding fixes_applied column...');
        await db.execute(sql`
          ALTER TABLE "formatting_qa_sessions" 
          ADD COLUMN "fixes_applied" jsonb
        `);
      } else {
        console.log('fixes_applied column already exists');
      }
      
      // Commit transaction
      await db.execute(sql`COMMIT`);
      
      console.log('Formatting QA v2 migration completed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Formatting QA v2 migration completed successfully - added cleaned_article and fixes_applied columns'
      });
      
    } catch (error) {
      // Rollback on error
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
    
  } catch (error: any) {
    console.error('Error in formatting QA v2 migration:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('Checking formatting QA v2 migration status...');
    
    // Check if both columns exist
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'formatting_qa_sessions' 
      AND column_name IN ('cleaned_article', 'fixes_applied')
      ORDER BY column_name
    `);
    
    const columns = (columnCheck as any).rows || columnCheck;
    const columnsArray = Array.isArray(columns) ? columns : [];
    const hasCleanedArticle = columnsArray.some((col: any) => col.column_name === 'cleaned_article');
    const hasFixesApplied = columnsArray.some((col: any) => col.column_name === 'fixes_applied');
    
    const status = {
      cleaned_article_exists: hasCleanedArticle,
      fixes_applied_exists: hasFixesApplied,
      migration_needed: !hasCleanedArticle || !hasFixesApplied,
      columns_found: columnsArray.map((col: any) => col.column_name)
    };
    
    return NextResponse.json({
      success: true,
      status,
      message: status.migration_needed ? 
        'Migration needed - some columns are missing' : 
        'All columns exist - no migration needed'
    });
    
  } catch (error: any) {
    console.error('Error checking formatting QA v2 status:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('Starting formatting QA v2 rollback - removing cleaned_article and fixes_applied columns...');
    
    // Start transaction
    await db.execute(sql`BEGIN`);
    
    try {
      // Remove cleaned_article column if it exists
      await db.execute(sql`
        ALTER TABLE "formatting_qa_sessions" 
        DROP COLUMN IF EXISTS "cleaned_article"
      `);
      
      // Remove fixes_applied column if it exists
      await db.execute(sql`
        ALTER TABLE "formatting_qa_sessions" 
        DROP COLUMN IF EXISTS "fixes_applied"
      `);
      
      // Commit transaction
      await db.execute(sql`COMMIT`);
      
      console.log('Formatting QA v2 rollback completed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Formatting QA v2 rollback completed successfully - removed cleaned_article and fixes_applied columns'
      });
      
    } catch (error) {
      // Rollback on error
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
    
  } catch (error: any) {
    console.error('Error in formatting QA v2 rollback:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}