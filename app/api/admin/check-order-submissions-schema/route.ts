import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Auth check - admin only
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Checking order_site_submissions table schema...');

    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'order_site_submissions'
      ) as exists
    `);

    const exists = tableExists.rows[0]?.exists || false;

    if (!exists) {
      return NextResponse.json({
        tableName: 'order_site_submissions',
        exists: false,
        columns: [],
        missingColumns: [],
        expectedColumns: []
      });
    }

    // Get current columns
    const columnsResult = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'order_site_submissions'
      ORDER BY ordinal_position
    `);

    const currentColumns = columnsResult.rows as Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>;

    // Expected columns based on the schema
    const expectedColumns = [
      'id',
      'order_group_id',
      'domain_id',
      'submission_status',
      'submitted_at',
      'submitted_by',
      'client_reviewed_at',
      'client_reviewed_by', // This is the one that's missing!
      'client_review_notes',
      'completed_at',
      'published_url',
      'published_at',
      'metadata',
      'created_at',
      'updated_at'
    ];

    // Find missing columns
    const currentColumnNames = currentColumns.map(col => col.column_name);
    const missingColumns = expectedColumns.filter(col => !currentColumnNames.includes(col));

    console.log('Current columns:', currentColumnNames);
    console.log('Missing columns:', missingColumns);

    return NextResponse.json({
      tableName: 'order_site_submissions',
      exists: true,
      columns: currentColumns,
      missingColumns,
      expectedColumns
    });

  } catch (error: any) {
    console.error('Error checking schema:', error);
    return NextResponse.json(
      { error: 'Failed to check schema', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}