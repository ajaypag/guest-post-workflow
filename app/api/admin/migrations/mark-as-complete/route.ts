import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { migrations } = await request.json();

    if (!migrations || !Array.isArray(migrations)) {
      return NextResponse.json({ 
        error: 'Please provide an array of migration names to mark as complete' 
      }, { status: 400 });
    }

    // Mark migrations as complete
    const results = [];
    for (const migrationName of migrations) {
      try {
        await db.execute(sql`
          INSERT INTO migration_history (migration_name, success, applied_by)
          VALUES (${migrationName}, true, 'admin-manual')
          ON CONFLICT (migration_name) DO UPDATE
          SET executed_at = NOW(), success = true, applied_by = 'admin-manual'
        `);
        results.push({ migration: migrationName, status: 'marked as complete' });
      } catch (error) {
        results.push({ 
          migration: migrationName, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migrations marked as complete',
      results
    });

  } catch (error) {
    console.error('Error marking migrations as complete:', error);
    return NextResponse.json(
      { error: 'Failed to mark migrations as complete' },
      { status: 500 }
    );
  }
}