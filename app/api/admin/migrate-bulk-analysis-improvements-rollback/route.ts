import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Drop indexes first
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_client_status_workflow
    `);
    
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_created_at
    `);
    
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_domain
    `);
    
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_has_workflow
    `);
    
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_qualification_status
    `);
    
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_client_id
    `);
    
    // Remove workflow tracking columns
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains 
      DROP COLUMN IF EXISTS has_workflow,
      DROP COLUMN IF EXISTS workflow_id,
      DROP COLUMN IF EXISTS workflow_created_at
    `);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error rolling back bulk analysis improvements:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}