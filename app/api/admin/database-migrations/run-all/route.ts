import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check admin permissions
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[MIGRATION] Running all database migrations...');

    const results = [];
    const baseUrl = request.nextUrl.origin;

    // 1. Create line items tables
    try {
      const response = await fetch(`${baseUrl}/api/admin/database-migrations/create-line-items-tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        }
      });
      const data = await response.json();
      results.push({
        migration: 'create-line-items-tables',
        success: response.ok,
        message: data.message || data.error
      });
    } catch (error) {
      results.push({
        migration: 'create-line-items-tables',
        success: false,
        message: 'Failed to run migration'
      });
    }

    // 2. Add inclusion status columns
    try {
      const response = await fetch(`${baseUrl}/api/admin/database-migrations/add-inclusion-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        }
      });
      const data = await response.json();
      results.push({
        migration: 'add-inclusion-columns',
        success: response.ok,
        message: data.message || data.error
      });
    } catch (error) {
      results.push({
        migration: 'add-inclusion-columns',
        success: false,
        message: 'Failed to run migration'
      });
    }

    // 3. Migrate pool to status system (if needed)
    try {
      const response = await fetch(`${baseUrl}/api/admin/pool-to-status-migration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({ dryRun: false })
      });
      const data = await response.json();
      results.push({
        migration: 'pool-to-status',
        success: response.ok,
        message: data.message || data.error || 'Pool to status migration completed'
      });
    } catch (error) {
      results.push({
        migration: 'pool-to-status',
        success: false,
        message: 'Failed to run migration'
      });
    }

    const allSuccess = results.every(r => r.success);

    console.log('[MIGRATION] All migrations completed');
    console.log('Results:', results);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess 
        ? 'All database migrations completed successfully' 
        : 'Some migrations failed - check results for details',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MIGRATION] Error running all migrations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run all migrations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}