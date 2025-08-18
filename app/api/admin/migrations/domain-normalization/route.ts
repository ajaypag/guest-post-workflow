import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { execute } = await request.json();
    
    if (!execute) {
      return NextResponse.json({ error: 'Execute flag not set' }, { status: 400 });
    }

    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '0037_normalize_existing_domains.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        error: 'Migration file not found',
        path: migrationPath 
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    // Check normalization results
    const websiteStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(normalized_domain) as normalized
      FROM websites
    `);

    const duplicates = await db.execute(sql`
      SELECT normalized_domain, COUNT(*) as count
      FROM websites
      WHERE normalized_domain IS NOT NULL
      GROUP BY normalized_domain
      HAVING COUNT(*) > 1
    `);

    return NextResponse.json({
      success: true,
      message: 'Domain normalization migration completed successfully',
      details: {
        totalWebsites: websiteStats.rows[0]?.total || 0,
        normalizedWebsites: websiteStats.rows[0]?.normalized || 0,
        duplicatesFound: duplicates.rows.length,
        duplicates: duplicates.rows
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Migration failed',
      details: error
    }, { status: 500 });
  }
}