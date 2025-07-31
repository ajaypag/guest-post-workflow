import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  console.log('[Fix Email Logs Table] Starting fix...');
  const log: string[] = [];
  
  try {
    // Step 1: Drop the incomplete table
    log.push('Dropping incomplete email_logs table...');
    await db.execute(sql`DROP TABLE IF EXISTS email_logs CASCADE`);
    log.push('✓ Table dropped');
    
    // Step 2: Create the complete table with all columns
    log.push('Creating complete email_logs table...');
    await db.execute(sql`
      CREATE TABLE email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Email details
        type VARCHAR(50) NOT NULL,
        recipients TEXT[] NOT NULL,
        subject VARCHAR(255) NOT NULL,
        
        -- Status tracking
        status VARCHAR(20) NOT NULL,
        sent_at TIMESTAMP,
        error TEXT,
        
        -- Resend integration
        resend_id VARCHAR(255),
        
        -- Metadata
        metadata JSONB,
        
        -- User tracking
        sent_by UUID REFERENCES users(id),
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    log.push('✓ Table created with all columns');
    
    // Step 3: Create indexes
    const indexes = [
      'CREATE INDEX idx_email_logs_type ON email_logs(type)',
      'CREATE INDEX idx_email_logs_status ON email_logs(status)',
      'CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at)',
      'CREATE INDEX idx_email_logs_created_at ON email_logs(created_at)',
      'CREATE INDEX idx_email_logs_resend_id ON email_logs(resend_id)',
      'CREATE INDEX idx_email_logs_recipients ON email_logs USING GIN(recipients)'
    ];
    
    for (const indexSql of indexes) {
      try {
        await db.execute(sql.raw(indexSql));
        log.push(`✓ Index created: ${indexSql.split(' ')[2]}`);
      } catch (indexError: any) {
        log.push(`⚠ Index failed: ${indexError.message}`);
      }
    }
    
    // Step 4: Create trigger function if it doesn't exist
    log.push('Creating trigger function...');
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    log.push('✓ Trigger function created');
    
    // Step 5: Create trigger
    log.push('Creating update trigger...');
    await db.execute(sql`
      CREATE TRIGGER update_email_logs_updated_at 
      BEFORE UPDATE ON email_logs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    log.push('✓ Trigger created');
    
    // Step 6: Verify
    const verify = await db.execute(sql`
      SELECT 
        COUNT(*) as column_count,
        array_agg(column_name ORDER BY ordinal_position) as columns
      FROM information_schema.columns 
      WHERE table_name = 'email_logs'
    `) as any;
    
    log.push(`✅ Table created successfully with ${verify[0]?.column_count} columns`);
    
    return NextResponse.json({
      success: true,
      message: 'Email logs table fixed and created successfully',
      log,
      columns: verify[0]?.columns || []
    });
    
  } catch (error: any) {
    console.error('[Fix Email Logs Table] Error:', error);
    log.push(`❌ Error: ${error.message}`);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Fix failed',
      detail: error.detail || undefined,
      log
    }, { status: 500 });
  }
}