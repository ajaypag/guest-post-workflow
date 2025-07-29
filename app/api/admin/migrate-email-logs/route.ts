import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // TODO: Add authentication check when auth system is implemented

    // Run the migration
    await db.execute(sql`
      -- Create email logs table for tracking all email activity
      CREATE TABLE IF NOT EXISTS email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Email details
        type VARCHAR(50) NOT NULL, -- welcome, password-reset, workflow-completed, etc.
        recipients TEXT[] NOT NULL, -- Array of recipient emails
        subject VARCHAR(255) NOT NULL,
        
        -- Status tracking
        status VARCHAR(20) NOT NULL, -- sent, failed, queued
        sent_at TIMESTAMP,
        error TEXT,
        
        -- Resend integration
        resend_id VARCHAR(255), -- Resend's email ID for tracking
        
        -- Metadata
        metadata JSONB, -- Additional email data (from, cc, bcc, attachments info, etc.)
        
        -- User tracking
        sent_by UUID REFERENCES users(id), -- Who triggered the email
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
      CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
      CREATE INDEX IF NOT EXISTS idx_email_logs_recipients ON email_logs USING GIN(recipients);
      CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
      CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON email_logs(resend_id);

      -- Add trigger to update updated_at
      CREATE OR REPLACE TRIGGER update_email_logs_updated_at 
      BEFORE UPDATE ON email_logs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      -- Add comment
      COMMENT ON TABLE email_logs IS 'Tracks all email sending activity through Resend';
    `);

    return NextResponse.json({
      success: true,
      message: 'Email logs table created successfully'
    });
  } catch (error: any) {
    console.error('Email logs migration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Migration failed' 
      },
      { status: 500 }
    );
  }
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