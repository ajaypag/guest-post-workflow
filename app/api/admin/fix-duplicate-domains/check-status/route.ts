import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checks = [];
    const constraints = [];

    // Check for required columns
    const requiredColumns = [
      'duplicate_of',
      'duplicate_resolution', 
      'duplicate_resolved_by',
      'duplicate_resolved_at',
      'original_project_id',
      'resolution_metadata'
    ];

    for (const column of requiredColumns) {
      try {
        const result = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM information_schema.columns 
          WHERE table_name = 'bulk_analysis_domains' 
          AND column_name = ${column}
        `);
        
        const exists = (result.rows[0] as any).count > 0;
        checks.push({
          name: `column:${column}`,
          status: exists ? 'exists' : 'missing',
          details: { column, exists }
        });
      } catch (error) {
        checks.push({
          name: `column:${column}`,
          status: 'error',
          error: (error as Error).message
        });
      }
    }

    // Check for old constraint that should NOT exist
    try {
      const oldConstraintResult = await db.execute(sql`
        SELECT 
          conname,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conname = 'idx_bulk_analysis_domains_client_domain'
      `);
      
      if (oldConstraintResult.rows.length > 0) {
        const constraint = oldConstraintResult.rows[0] as any;
        constraints.push({
          name: constraint.conname,
          definition: constraint.definition,
          shouldExist: false
        });
      }
    } catch (error) {
      console.log('Error checking old constraint:', error);
    }

    // Also check if it exists as an index
    try {
      const oldIndexResult = await db.execute(sql`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE indexname = 'idx_bulk_analysis_domains_client_domain'
      `);
      
      if (oldIndexResult.rows.length > 0) {
        const index = oldIndexResult.rows[0] as any;
        constraints.push({
          name: index.indexname,
          definition: index.indexdef,
          shouldExist: false
        });
      }
    } catch (error) {
      console.log('Error checking old index:', error);
    }

    // Check for new constraint that SHOULD exist
    try {
      const newConstraintResult = await db.execute(sql`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE indexname = 'uk_bulk_analysis_domains_client_domain_project'
      `);
      
      if (newConstraintResult.rows.length > 0) {
        const index = newConstraintResult.rows[0] as any;
        constraints.push({
          name: index.indexname,
          definition: index.indexdef,
          shouldExist: true
        });
      } else {
        constraints.push({
          name: 'uk_bulk_analysis_domains_client_domain_project',
          definition: 'UNIQUE INDEX ON (client_id, domain, project_id)',
          shouldExist: true
        });
      }
    } catch (error) {
      console.log('Error checking new constraint:', error);
    }

    // Check for performance indexes
    const performanceIndexes = [
      'idx_bulk_domains_duplicate_of',
      'idx_bulk_domains_resolution',
      'idx_bulk_domains_original_project'
    ];

    for (const indexName of performanceIndexes) {
      try {
        const result = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM pg_indexes 
          WHERE indexname = ${indexName}
        `);
        
        const exists = (result.rows[0] as any).count > 0;
        checks.push({
          name: `index:${indexName}`,
          status: exists ? 'exists' : 'missing',
          details: { indexName, exists }
        });
      } catch (error) {
        checks.push({
          name: `index:${indexName}`,
          status: 'error',
          error: (error as Error).message
        });
      }
    }

    // Get actual constraint details
    const actualConstraints = await db.execute(sql`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'bulk_analysis_domains'::regclass 
      AND contype = 'u'
    `);

    return NextResponse.json({
      checks,
      constraints,
      actualConstraints: actualConstraints.rows,
      summary: {
        totalChecks: checks.length,
        passing: checks.filter(c => c.status === 'exists').length,
        missing: checks.filter(c => c.status === 'missing').length,
        errors: checks.filter(c => c.status === 'error').length
      }
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status', details: error.message },
      { status: 500 }
    );
  }
}