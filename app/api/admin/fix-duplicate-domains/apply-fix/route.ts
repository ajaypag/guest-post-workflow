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
        message: 'Dry run - send execute: true to apply fix' 
      });
    }

    console.log('Starting duplicate domain fix migration...');
    const results = {
      oldConstraintDropped: false,
      newConstraintCreated: false,
      columnsAdded: [] as string[],
      indexesCreated: 0,
      errors: [] as string[]
    };

    // Step 1: Drop the old constraint (both as constraint and index)
    try {
      console.log('Dropping old constraint...');
      
      // Try to drop as constraint
      await db.execute(sql`
        ALTER TABLE bulk_analysis_domains 
        DROP CONSTRAINT IF EXISTS idx_bulk_analysis_domains_client_domain
      `);
      
      // Try to drop as index
      await db.execute(sql`
        DROP INDEX IF EXISTS idx_bulk_analysis_domains_client_domain
      `);
      
      // Check if any unique constraint on (client_id, domain) still exists
      const remainingConstraints = await db.execute(sql`
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'bulk_analysis_domains'::regclass 
        AND contype = 'u'
        AND NOT conname LIKE '%project%'
      `);
      
      // Drop any remaining constraints that might block duplicates
      for (const row of remainingConstraints.rows) {
        const constraintName = (row as any).conname;
        console.log(`Dropping additional constraint: ${constraintName}`);
        await db.execute(sql`
          ALTER TABLE bulk_analysis_domains 
          DROP CONSTRAINT IF EXISTS ${sql.raw(constraintName)}
        `);
      }
      
      results.oldConstraintDropped = true;
      console.log('Old constraints dropped successfully');
    } catch (error) {
      console.error('Error dropping old constraint:', error);
      results.errors.push(`Failed to drop old constraint: ${(error as Error).message}`);
    }

    // Step 2: Add missing columns
    const columnsToAdd = [
      { name: 'duplicate_of', type: 'UUID REFERENCES bulk_analysis_domains(id)' },
      { name: 'duplicate_resolution', type: "VARCHAR(50) CHECK (duplicate_resolution IN ('keep_both', 'move_to_new', 'skip', 'update_original'))" },
      { name: 'duplicate_resolved_by', type: 'UUID REFERENCES users(id)' },
      { name: 'duplicate_resolved_at', type: 'TIMESTAMP' },
      { name: 'original_project_id', type: 'UUID REFERENCES bulk_analysis_projects(id)' },
      { name: 'resolution_metadata', type: 'JSONB' }
    ];

    for (const column of columnsToAdd) {
      try {
        // Check if column exists
        const checkResult = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM information_schema.columns 
          WHERE table_name = 'bulk_analysis_domains' 
          AND column_name = ${column.name}
        `);
        
        if ((checkResult.rows[0] as any).count === 0) {
          console.log(`Adding column ${column.name}...`);
          await db.execute(sql`
            ALTER TABLE bulk_analysis_domains 
            ADD COLUMN ${sql.raw(column.name)} ${sql.raw(column.type)}
          `);
          results.columnsAdded.push(column.name);
          console.log(`Column ${column.name} added successfully`);
        } else {
          console.log(`Column ${column.name} already exists`);
        }
      } catch (error) {
        console.error(`Error adding column ${column.name}:`, error);
        results.errors.push(`Failed to add column ${column.name}: ${(error as Error).message}`);
      }
    }

    // Step 3: Create new unique constraint
    try {
      console.log('Creating new unique constraint...');
      
      // Check if it already exists
      const checkResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_indexes 
        WHERE indexname = 'uk_bulk_analysis_domains_client_domain_project'
      `);
      
      if ((checkResult.rows[0] as any).count === 0) {
        await db.execute(sql`
          CREATE UNIQUE INDEX uk_bulk_analysis_domains_client_domain_project 
          ON bulk_analysis_domains(client_id, domain, project_id)
        `);
        results.newConstraintCreated = true;
        console.log('New constraint created successfully');
      } else {
        console.log('New constraint already exists');
        results.newConstraintCreated = true;
      }
    } catch (error) {
      console.error('Error creating new constraint:', error);
      results.errors.push(`Failed to create new constraint: ${(error as Error).message}`);
    }

    // Step 4: Create performance indexes
    const indexesToCreate = [
      { name: 'idx_bulk_domains_duplicate_of', column: 'duplicate_of' },
      { name: 'idx_bulk_domains_resolution', column: 'duplicate_resolution' },
      { name: 'idx_bulk_domains_original_project', column: 'original_project_id' }
    ];

    for (const index of indexesToCreate) {
      try {
        // Check if index exists
        const checkResult = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM pg_indexes 
          WHERE indexname = ${index.name}
        `);
        
        if ((checkResult.rows[0] as any).count === 0) {
          console.log(`Creating index ${index.name}...`);
          await db.execute(sql`
            CREATE INDEX ${sql.raw(index.name)} 
            ON bulk_analysis_domains(${sql.raw(index.column)})
          `);
          results.indexesCreated++;
          console.log(`Index ${index.name} created successfully`);
        }
      } catch (error) {
        console.error(`Error creating index ${index.name}:`, error);
        // Not critical, don't add to errors
      }
    }

    // Step 5: Verify the fix
    const verification = {
      columnsExist: false,
      oldConstraintRemoved: false,
      newConstraintExists: false
    };

    // Check columns
    const columnCheck = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.columns 
      WHERE table_name = 'bulk_analysis_domains' 
      AND column_name IN ('duplicate_of', 'duplicate_resolution', 'duplicate_resolved_by', 
                          'duplicate_resolved_at', 'original_project_id', 'resolution_metadata')
    `);
    verification.columnsExist = (columnCheck.rows[0] as any).count === 6;

    // Check old constraint is gone
    const oldConstraintCheck = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM pg_constraint 
      WHERE conname = 'idx_bulk_analysis_domains_client_domain'
    `);
    const oldIndexCheck = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE indexname = 'idx_bulk_analysis_domains_client_domain'
    `);
    verification.oldConstraintRemoved = 
      (oldConstraintCheck.rows[0] as any).count === 0 && 
      (oldIndexCheck.rows[0] as any).count === 0;

    // Check new constraint exists
    const newConstraintCheck = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE indexname = 'uk_bulk_analysis_domains_client_domain_project'
    `);
    verification.newConstraintExists = (newConstraintCheck.rows[0] as any).count > 0;

    // Final status
    const success = verification.columnsExist && 
                   verification.oldConstraintRemoved && 
                   verification.newConstraintExists &&
                   results.errors.length === 0;

    return NextResponse.json({
      success,
      message: success 
        ? 'Database migration completed successfully! Duplicate domains can now exist across projects.'
        : 'Migration completed with some issues. Check the details below.',
      ...results,
      verification,
      errors: results.errors.length > 0 ? results.errors : undefined
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