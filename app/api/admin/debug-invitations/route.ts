import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { AuthServiceServer } from '@/lib/auth-server';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only internal admin users
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    console.log('[DebugInvitations] Fetching all invitations...');

    // Get all invitations with raw SQL to see exactly what's in the database
    const invitationsResult = await db.execute(sql`
      SELECT * FROM invitations 
      ORDER BY created_at DESC 
      LIMIT 20
    `);

    // Get column information
    const columnsResult = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invitations'
      ORDER BY ordinal_position
    `);

    // Get count of invitations by status
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as used,
        COUNT(CASE WHEN revoked_at IS NOT NULL THEN 1 END) as revoked,
        COUNT(CASE WHEN expires_at < NOW() AND used_at IS NULL AND revoked_at IS NULL THEN 1 END) as expired,
        COUNT(CASE WHEN expires_at >= NOW() AND used_at IS NULL AND revoked_at IS NULL THEN 1 END) as active
      FROM invitations
    `);

    // Check for recent invitations (last hour)
    const recentResult = await db.execute(sql`
      SELECT * FROM invitations 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      columns: columnsResult.rows,
      stats: statsResult.rows[0],
      invitations: invitationsResult.rows,
      recentInvitations: recentResult.rows,
      debug: {
        totalColumns: columnsResult.rows.length,
        totalInvitations: invitationsResult.rows.length,
        recentCount: recentResult.rows.length
      }
    });

  } catch (error) {
    console.error('[DebugInvitations] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug invitations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}