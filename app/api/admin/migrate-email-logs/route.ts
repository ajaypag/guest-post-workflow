import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  console.log('[Email Logs Migration] Starting migration...');
  
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Start the migration in the background
  (async () => {
    try {
      // TODO: Add authentication check when auth system is implemented
      
      await writer.write(encoder.encode('data: {"step": "start", "message": "Starting email logs migration..."}\n\n'));
      
      // Step 1: Create the table
      await writer.write(encoder.encode('data: {"step": "table", "message": "Creating email_logs table..."}\n\n'));
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_logs (
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
      
      await writer.write(encoder.encode('data: {"step": "table", "message": "Table created successfully"}\n\n'));
      
      // Step 2: Create indexes one by one
      const indexes = [
        { name: 'idx_email_logs_type', sql: 'CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type)' },
        { name: 'idx_email_logs_status', sql: 'CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)' },
        { name: 'idx_email_logs_recipients', sql: 'CREATE INDEX IF NOT EXISTS idx_email_logs_recipients ON email_logs USING GIN(recipients)' },
        { name: 'idx_email_logs_sent_at', sql: 'CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at)' },
        { name: 'idx_email_logs_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at)' },
        { name: 'idx_email_logs_resend_id', sql: 'CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON email_logs(resend_id)' }
      ];
      
      for (const index of indexes) {
        await writer.write(encoder.encode(`data: {"step": "index", "message": "Creating index ${index.name}..."}\n\n`));
        await db.execute(sql.raw(index.sql));
      }
      
      await writer.write(encoder.encode('data: {"step": "indexes", "message": "All indexes created successfully"}\n\n'));
      
      // Step 3: Create trigger
      await writer.write(encoder.encode('data: {"step": "trigger", "message": "Creating update trigger..."}\n\n'));
      
      // First check if the function exists
      const functionCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = 'update_updated_at_column'
        ) as exists
      `) as any;
      
      if (!functionCheck[0]?.exists) {
        // Create the function if it doesn't exist
        await db.execute(sql`
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
          END;
          $$ language 'plpgsql'
        `);
      }
      
      await db.execute(sql`
        CREATE OR REPLACE TRIGGER update_email_logs_updated_at 
        BEFORE UPDATE ON email_logs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
      
      await writer.write(encoder.encode('data: {"step": "trigger", "message": "Trigger created successfully"}\n\n'));
      
      // Step 4: Add comment
      await db.execute(sql`
        COMMENT ON TABLE email_logs IS 'Tracks all email sending activity through Resend'
      `);
      
      await writer.write(encoder.encode('data: {"step": "complete", "success": true, "message": "Email logs migration completed successfully!"}\n\n'));
      
    } catch (error: any) {
      console.error('[Email Logs Migration] Error:', error);
      await writer.write(encoder.encode(`data: {"step": "error", "success": false, "error": "${error.message || 'Migration failed'}"}\n\n`));
    } finally {
      await writer.close();
    }
  })();
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function DELETE() {
  try {
    // TODO: Add authentication check when auth system is implemented

    // Rollback the migration
    await db.execute(sql`
      -- Drop the trigger first
      DROP TRIGGER IF EXISTS update_email_logs_updated_at ON email_logs;
      
      -- Drop the table (this will also drop all indexes)
      DROP TABLE IF EXISTS email_logs CASCADE;
    `);

    return NextResponse.json({
      success: true,
      message: 'Email logs table removed successfully'
    });
  } catch (error: any) {
    console.error('Email logs rollback error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Rollback failed' 
      },
      { status: 500 }
    );
  }
}