import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  console.log('[Email Logs Migration Simple] Starting migration...');
  
  try {
    // TODO: Add authentication check when auth system is implemented
    
    // First check if table already exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs'
      ) as exists
    `) as any;
    
    if (tableCheck[0]?.exists) {
      console.log('[Email Logs Migration Simple] Table already exists');
      return NextResponse.json({
        success: true,
        message: 'Email logs table already exists'
      });
    }
    
    // Create the table without indexes first
    console.log('[Email Logs Migration Simple] Creating table...');
    await db.execute(sql`
      CREATE TABLE email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        recipients TEXT[] NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL,
        sent_at TIMESTAMP,
        error TEXT,
        resend_id VARCHAR(255),
        metadata JSONB,
        sent_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('[Email Logs Migration Simple] Table created successfully');
    
    // Try to create indexes, but don't fail if they error
    try {
      await db.execute(sql`CREATE INDEX idx_email_logs_type ON email_logs(type)`);
      await db.execute(sql`CREATE INDEX idx_email_logs_status ON email_logs(status)`);
      console.log('[Email Logs Migration Simple] Basic indexes created');
    } catch (indexError) {
      console.warn('[Email Logs Migration Simple] Some indexes may have failed:', indexError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email logs table created successfully (simplified version)'
    });
    
  } catch (error: any) {
    console.error('[Email Logs Migration Simple] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Migration failed',
        details: error.detail || undefined
      },
      { status: 500 }
    );
  }
}