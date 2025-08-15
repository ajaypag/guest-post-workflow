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
    const migrationPath = path.join(process.cwd(), 'migrations', '0039_add_missing_website_columns.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        error: 'Migration file not found',
        path: migrationPath 
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    // Verify columns were added
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND column_name IN (
        'publisher_tier',
        'preferred_content_types',
        'editorial_calendar_url',
        'content_guidelines_url',
        'typical_turnaround_days',
        'accepts_do_follow',
        'requires_author_bio',
        'max_links_per_post',
        'primary_contact_id',
        'publisher_company',
        'website_language',
        'target_audience',
        'avg_response_time_hours',
        'success_rate_percentage',
        'last_campaign_date',
        'total_posts_published',
        'internal_quality_score',
        'internal_notes',
        'account_manager_id',
        'organization_id'
      )
    `);

    return NextResponse.json({
      success: true,
      message: 'Website publisher columns migration completed successfully',
      columnsAdded: columns.rows.map((r: any) => r.column_name),
      details: {
        columnsAdded: columns.rows.length,
        expectedColumns: 20
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