import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Add workflow tracking columns
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains 
      ADD COLUMN IF NOT EXISTS has_workflow BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS workflow_id UUID,
      ADD COLUMN IF NOT EXISTS workflow_created_at TIMESTAMP
    `);
    
    // Add indexes for better query performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_client_id 
      ON bulk_analysis_domains(client_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_qualification_status 
      ON bulk_analysis_domains(qualification_status)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_has_workflow 
      ON bulk_analysis_domains(has_workflow)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_domain 
      ON bulk_analysis_domains(domain)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_created_at 
      ON bulk_analysis_domains(created_at DESC)
    `);
    
    // Add composite index for common filtering patterns
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_client_status_workflow 
      ON bulk_analysis_domains(client_id, qualification_status, has_workflow)
    `);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error running bulk analysis improvements migration:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}