import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting Airtable migration...');
    
    // Run the migration SQL
    const migrationSql = `
      -- Add Airtable metadata columns
      ALTER TABLE bulk_analysis_domains 
      ADD COLUMN IF NOT EXISTS airtable_record_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS airtable_metadata JSONB,
      ADD COLUMN IF NOT EXISTS airtable_last_synced TIMESTAMP;
      
      -- Add index for better query performance
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_airtable_record_id 
      ON bulk_analysis_domains(airtable_record_id);
    `;
    
    await db.execute(sql.raw(migrationSql));
    
    console.log('Airtable migration completed successfully');
    
    return NextResponse.json({
      success: true,
      output: 'Migration completed successfully!\n\nAdded columns:\n- airtable_record_id (VARCHAR(255))\n- airtable_metadata (JSONB)\n- airtable_last_synced (TIMESTAMP)\n\nAdded index:\n- idx_bulk_analysis_domains_airtable_record_id'
    });
    
  } catch (error: any) {
    console.error('Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${error.message}\n\nStack trace:\n${error.stack}`
    }, { status: 500 });
  }
}