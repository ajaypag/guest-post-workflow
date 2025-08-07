import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check admin permissions
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[MIGRATION] Adding inclusion status columns...');

    const columnsAdded = [];
    const columnsSkipped = [];

    // Check existing columns
    const existingColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_site_submissions'
      AND column_name IN ('inclusion_status', 'inclusion_order', 'exclusion_reason')
    `);

    const existingColumnNames = existingColumns.rows.map((row: any) => row.column_name);

    // Add inclusion_status column
    if (!existingColumnNames.includes('inclusion_status')) {
      await db.execute(sql`
        ALTER TABLE order_site_submissions 
        ADD COLUMN IF NOT EXISTS inclusion_status VARCHAR(50)
      `);
      columnsAdded.push('inclusion_status');
    } else {
      columnsSkipped.push('inclusion_status');
    }

    // Add inclusion_order column
    if (!existingColumnNames.includes('inclusion_order')) {
      await db.execute(sql`
        ALTER TABLE order_site_submissions 
        ADD COLUMN IF NOT EXISTS inclusion_order INTEGER
      `);
      columnsAdded.push('inclusion_order');
    } else {
      columnsSkipped.push('inclusion_order');
    }

    // Add exclusion_reason column
    if (!existingColumnNames.includes('exclusion_reason')) {
      await db.execute(sql`
        ALTER TABLE order_site_submissions 
        ADD COLUMN IF NOT EXISTS exclusion_reason TEXT
      `);
      columnsAdded.push('exclusion_reason');
    } else {
      columnsSkipped.push('exclusion_reason');
    }

    // Create index on inclusion_status for better query performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_submissions_inclusion_status 
      ON order_site_submissions(inclusion_status)
    `);

    console.log('[MIGRATION] Inclusion status columns added');
    console.log('Columns added:', columnsAdded);
    console.log('Columns skipped (already exist):', columnsSkipped);

    return NextResponse.json({
      success: true,
      message: columnsAdded.length > 0 
        ? `Successfully added ${columnsAdded.length} columns` 
        : 'All columns already exist',
      columnsAdded,
      columnsSkipped,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MIGRATION] Error adding inclusion columns:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add inclusion columns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}