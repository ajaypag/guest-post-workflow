import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting sender_email column migration...');
    
    const result = await db.execute(`
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_processing_logs' AND column_name='sender_email') THEN
              ALTER TABLE email_processing_logs ADD COLUMN sender_email VARCHAR(255);
              RAISE NOTICE 'Added sender_email column to email_processing_logs';
          ELSE
              RAISE NOTICE 'sender_email column already exists in email_processing_logs';
          END IF;
      END $$;
    `);

    console.log('✅ sender_email migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'sender_email column migration completed successfully. Column has been added to email_processing_logs table.'
    });

  } catch (error) {
    console.error('❌ sender_email migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    }, { status: 500 });
  }
}