import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    console.log('[TestInvitationToken] Testing token:', token);

    // First, check if invitations table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invitations'
      )
    `);

    console.log('[TestInvitationToken] Table exists check:', tableCheck.rows);

    // Get all columns from invitations table
    const columnsResult = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invitations' 
      ORDER BY ordinal_position
    `);

    console.log('[TestInvitationToken] Table columns:', columnsResult.rows);

    let tokenSearch = null;
    if (token) {
      // Search for the specific token
      const tokenResult = await db.execute(sql`
        SELECT * FROM invitations 
        WHERE token = ${token}
      `);

      console.log('[TestInvitationToken] Token search result:', {
        found: tokenResult.rows.length,
        data: tokenResult.rows[0] || null
      });

      tokenSearch = tokenResult.rows[0] || null;
    }

    // Get last 5 invitations
    const recentInvitations = await db.execute(sql`
      SELECT id, email, token, target_table, role, expires_at, used_at, revoked_at, created_at
      FROM invitations 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('[TestInvitationToken] Recent invitations:', recentInvitations.rows);

    return NextResponse.json({
      success: true,
      tableExists: tableCheck.rows[0]?.exists || false,
      columns: columnsResult.rows,
      tokenSearch: token ? {
        searched: token,
        found: !!tokenSearch,
        data: tokenSearch
      } : null,
      recentInvitations: recentInvitations.rows,
      debug: {
        timestamp: new Date().toISOString(),
        url: request.url
      }
    });

  } catch (error) {
    console.error('[TestInvitationToken] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}