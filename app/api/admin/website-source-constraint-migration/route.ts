import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting website source constraint migration...');
    
    // Execute the migration SQL
    const migrationSQL = `
      DO $$ 
      BEGIN 
          -- Drop existing constraint if it exists
          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_website_source') THEN
              ALTER TABLE websites DROP CONSTRAINT check_website_source;
              RAISE NOTICE 'Dropped existing check_website_source constraint';
          END IF;
          
          -- Add updated constraint that includes 'manyreach'
          ALTER TABLE websites ADD CONSTRAINT check_website_source 
              CHECK (source IN ('airtable', 'publisher', 'internal', 'api', 'migration', 'manual', 'manyreach'));
          
          RAISE NOTICE 'Added updated check_website_source constraint with manyreach support';
      END $$;
    `;

    await db.execute(migrationSQL);

    console.log('✅ Website source constraint migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Website source constraint migration completed successfully. The constraint now allows "manyreach" as a valid source, which will fix the shadow publisher "0 websites" issue.'
    });

  } catch (error) {
    console.error('❌ Website source constraint migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    }, { status: 500 });
  }
}