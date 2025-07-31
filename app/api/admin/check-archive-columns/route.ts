import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if archive columns exist
    const result = await db.execute(sql`
      SELECT 
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN ('archived_at', 'archived_by', 'archive_reason')
    `);

    const columns = result.rows.map((row: any) => row.column_name);
    const hasAllColumns = columns.includes('archived_at') && 
                         columns.includes('archived_by') && 
                         columns.includes('archive_reason');

    console.log('[CHECK ARCHIVE] Found columns:', columns);

    return NextResponse.json({ 
      exists: hasAllColumns,
      columns: columns,
      message: hasAllColumns 
        ? 'All archive columns exist in clients table' 
        : `Missing columns: ${['archived_at', 'archived_by', 'archive_reason'].filter(c => !columns.includes(c)).join(', ')}`
    });

  } catch (error: any) {
    console.error('[CHECK ARCHIVE] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to check archive columns',
      exists: false 
    }, { status: 500 });
  }
}