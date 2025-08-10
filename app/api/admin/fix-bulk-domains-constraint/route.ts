import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  // For critical database fixes, allow both authenticated and local development access
  const isLocalDev = process.env.NODE_ENV === 'development';
  
  if (!isLocalDev) {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
  }
  
  try {
    // Check if the unique constraint already exists
    const existingConstraint = await db.execute(sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'bulk_analysis_domains' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'bulk_analysis_domains_client_domain_unique'
    `);
    
    if (existingConstraint.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Unique constraint already exists on bulk_analysis_domains (client_id, domain)',
        constraint: existingConstraint.rows[0]
      });
    }
    
    // Drop the existing non-unique index if it exists
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_bulk_domains_client_domain
    `);
    
    // Add the unique constraint
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains
      ADD CONSTRAINT bulk_analysis_domains_client_domain_unique 
      UNIQUE (client_id, domain)
    `);
    
    // Verify the constraint was created
    const verifyConstraint = await db.execute(sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'bulk_analysis_domains' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'bulk_analysis_domains_client_domain_unique'
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully added unique constraint on bulk_analysis_domains (client_id, domain)',
      constraint: verifyConstraint.rows[0],
      migrationNote: 'This fixes the ON CONFLICT upsert error for bulk analysis domain operations'
    });
    
  } catch (error: any) {
    console.error('Error adding unique constraint:', error);
    
    // Check if it's a duplicate key error (meaning we have duplicate data)
    // PostgreSQL error code 23505 is for unique_violation
    // Also check for the error detail which contains the duplicate key
    if (error.code === '23505' || (error.cause && error.cause.code === '23505') || 
        (error.message && error.message.includes('could not create unique index')) ||
        (error.detail && error.detail.includes('is duplicated'))) {
      
      // Extract the duplicate key from the error detail if available
      let duplicateInfo = null;
      if (error.detail || (error.cause && error.cause.detail)) {
        const detail = error.detail || error.cause.detail;
        const match = detail.match(/Key \(client_id, domain\)=\(([^,]+), ([^)]+)\)/);
        if (match) {
          duplicateInfo = {
            client_id: match[1],
            domain: match[2]
          };
        }
      }
      
      // Find all duplicates
      const duplicates = await db.execute(sql`
        SELECT client_id, domain, COUNT(*) as count
        FROM bulk_analysis_domains
        GROUP BY client_id, domain
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT 20
      `);
      
      return NextResponse.json({
        error: 'Cannot add unique constraint due to duplicate entries',
        duplicates: duplicates.rows,
        duplicateCount: duplicates.rows.length,
        specificDuplicate: duplicateInfo,
        message: `Found ${duplicates.rows.length} duplicate (client_id, domain) pairs. Click "Clean Duplicates & Retry" to automatically fix this.`,
        canClean: true
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: 'Failed to add unique constraint',
      details: error.message,
      code: error.code || (error.cause && error.cause.code),
      fullError: {
        message: error.message,
        code: error.code,
        cause: error.cause ? {
          code: error.cause.code,
          detail: error.cause.detail,
          severity: error.cause.severity
        } : undefined
      }
    }, { status: 500 });
  }
}

// POST endpoint to clean duplicates if needed
export async function POST(request: NextRequest) {
  // For critical database fixes, allow both authenticated and local development access
  const isLocalDev = process.env.NODE_ENV === 'development';
  
  if (!isLocalDev) {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
  }
  
  try {
    // Find all duplicates
    const duplicates = await db.execute(sql`
      SELECT client_id, domain, COUNT(*) as count
      FROM bulk_analysis_domains
      GROUP BY client_id, domain
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No duplicates found'
      });
    }
    
    let cleanedCount = 0;
    
    // For each duplicate set, keep the most recent one
    for (const dup of duplicates.rows) {
      // Get all records for this duplicate
      const records = await db.execute(sql`
        SELECT id, created_at, has_workflow, qualification_status
        FROM bulk_analysis_domains
        WHERE client_id = ${dup.client_id}
        AND domain = ${dup.domain}
        ORDER BY 
          has_workflow DESC,  -- Prefer records with workflows
          CASE 
            WHEN qualification_status = 'high_quality' THEN 1
            WHEN qualification_status = 'good_quality' THEN 2
            WHEN qualification_status = 'marginal_quality' THEN 3
            ELSE 4
          END,
          created_at DESC  -- Then by most recent
      `);
      
      // Keep the first one (best according to our criteria), delete the rest
      const toKeep = records.rows[0];
      const toDelete = records.rows.slice(1).map(r => r.id);
      
      if (toDelete.length > 0) {
        await db.execute(sql`
          DELETE FROM bulk_analysis_domains
          WHERE id = ANY(${toDelete})
        `);
        cleanedCount += toDelete.length;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleaned ${cleanedCount} duplicate records`,
      duplicatesFound: duplicates.rows.length,
      recordsRemoved: cleanedCount
    });
    
  } catch (error: any) {
    console.error('Error cleaning duplicates:', error);
    return NextResponse.json({
      error: 'Failed to clean duplicates',
      details: error.message
    }, { status: 500 });
  }
}