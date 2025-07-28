import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Create the dataforseo_api_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dataforseo_api_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        
        -- Request Info
        task_id VARCHAR(255),
        endpoint TEXT NOT NULL,
        request_payload JSONB NOT NULL,
        request_headers JSONB,
        
        -- Domain/Client Info
        domain_id UUID REFERENCES bulk_analysis_domains(id) ON DELETE SET NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        domain VARCHAR(255),
        
        -- Response Info
        response_status INTEGER,
        response_data JSONB,
        error_message TEXT,
        
        -- Metadata
        cost NUMERIC(10, 6),
        keyword_count INTEGER,
        location_code INTEGER,
        language_code VARCHAR(10),
        
        -- Timestamps
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        responded_at TIMESTAMP,
        
        -- Additional Context
        request_type VARCHAR(50),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for better query performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dataforseo_logs_task_id ON dataforseo_api_logs(task_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dataforseo_logs_domain_id ON dataforseo_api_logs(domain_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dataforseo_logs_client_id ON dataforseo_api_logs(client_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dataforseo_logs_requested_at ON dataforseo_api_logs(requested_at DESC)
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'DataForSEO logs table created successfully' 
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}