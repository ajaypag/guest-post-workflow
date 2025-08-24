import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Running email qualification tracking migration...');
    
    // Enhance email_processing_logs for qualification tracking
    await db.execute(sql`
      ALTER TABLE email_processing_logs 
      ADD COLUMN IF NOT EXISTS qualification_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS disqualification_reason VARCHAR(100)
    `);
    
    // Add index for qualification queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_email_logs_qualification_status 
      ON email_processing_logs(qualification_status)
    `);
    
    // Enhance publisher_offerings for source email tracking  
    await db.execute(sql`
      ALTER TABLE publisher_offerings 
      ADD COLUMN IF NOT EXISTS source_email_id UUID REFERENCES email_processing_logs(id),
      ADD COLUMN IF NOT EXISTS source_email_content TEXT,
      ADD COLUMN IF NOT EXISTS pricing_extracted_from TEXT
    `);
    
    // Add index for source email lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_publisher_offerings_source_email 
      ON publisher_offerings(source_email_id)
    `);
    
    // Update existing parsed emails to have qualification status
    const updateResult = await db.execute(sql`
      UPDATE email_processing_logs 
      SET qualification_status = 'legacy_processed' 
      WHERE status = 'parsed' AND qualification_status = 'pending'
    `);
    
    console.log('Migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Email qualification tracking migration completed',
      updatedRows: updateResult.rowCount || 0
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}