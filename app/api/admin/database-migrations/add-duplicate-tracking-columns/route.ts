import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { execute } = await request.json();

    if (!execute) {
      return NextResponse.json({ 
        message: 'Dry run - migration not executed. Send execute: true to run migration.' 
      });
    }

    console.log('Starting duplicate tracking columns migration...');

    // Step 0: Drop the existing unique constraint that prevents duplicates across projects
    // First, find the constraint name
    const constraintResult = await db.execute(sql`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'bulk_analysis_domains'::regclass 
      AND contype = 'u'
      AND NOT conname LIKE '%pkey%'
    `);
    
    if (constraintResult.rows.length > 0) {
      const constraintName = (constraintResult.rows[0] as any).conname;
      console.log(`Dropping existing constraint: ${constraintName}`);
      await db.execute(sql`ALTER TABLE bulk_analysis_domains DROP CONSTRAINT ${sql.raw(constraintName)}`);
    }

    // Step 1: Add columns for duplicate tracking and resolution history
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains 
      ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES bulk_analysis_domains(id),
      ADD COLUMN IF NOT EXISTS duplicate_resolution VARCHAR(50) CHECK (duplicate_resolution IN ('keep_both', 'move_to_new', 'skip', 'update_original')),
      ADD COLUMN IF NOT EXISTS duplicate_resolved_by UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS duplicate_resolved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS original_project_id UUID REFERENCES bulk_analysis_projects(id),
      ADD COLUMN IF NOT EXISTS resolution_metadata JSONB
    `);

    console.log('Added duplicate tracking columns');

    // Step 2: Create indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_domains_duplicate_of ON bulk_analysis_domains(duplicate_of)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_domains_resolution ON bulk_analysis_domains(duplicate_resolution)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_domains_original_project ON bulk_analysis_domains(original_project_id)
    `);

    console.log('Created indexes');

    // Step 3: Add comments to document the duplicate resolution values
    await db.execute(sql`
      COMMENT ON COLUMN bulk_analysis_domains.duplicate_resolution IS 'Resolution action taken: keep_both (domain exists in multiple projects), move_to_new (removed from original project), skip (not added to new project), update_original (original entry updated)'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN bulk_analysis_domains.duplicate_of IS 'References the original domain entry if this is a duplicate'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN bulk_analysis_domains.original_project_id IS 'Tracks the original project when domain was moved'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN bulk_analysis_domains.resolution_metadata IS 'JSON metadata about the resolution process including conflict details'
    `);

    console.log('Added column comments');

    // Step 4: Create new unique constraint that allows same domain in different projects
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uk_bulk_analysis_domains_client_domain_project 
      ON bulk_analysis_domains(client_id, domain, project_id)
    `);
    
    console.log('Added new unique constraint allowing duplicates across projects');

    // Verify columns were added
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bulk_analysis_domains' 
      AND column_name IN ('duplicate_of', 'duplicate_resolution', 'duplicate_resolved_by', 'duplicate_resolved_at', 'original_project_id', 'resolution_metadata')
    `);

    const addedColumns = result.rows.map((row: any) => row.column_name);

    return NextResponse.json({ 
      success: true,
      message: 'Duplicate tracking columns migration completed successfully',
      addedColumns,
      columnCount: addedColumns.length
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}