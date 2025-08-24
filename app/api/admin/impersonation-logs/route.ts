/**
 * API Endpoint: Impersonation Logs
 * 
 * GET /api/admin/impersonation-logs
 * 
 * Fetches impersonation logs with filtering options.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { getSessionPool } from '@/lib/db/sessionPool';

const pool = getSessionPool();

export async function GET(request: NextRequest) {
  try {
    // Check admin permissions
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ 
        error: 'Admin access required' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const timeRange = searchParams.get('timeRange') || 'week';

    // Build time range condition
    let timeCondition = '';
    switch (timeRange) {
      case 'today':
        timeCondition = "AND l.started_at >= CURRENT_DATE";
        break;
      case 'week':
        timeCondition = "AND l.started_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        timeCondition = "AND l.started_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'all':
      default:
        timeCondition = '';
        break;
    }

    // Build status condition
    let statusCondition = '';
    if (filter !== 'all') {
      statusCondition = "AND l.status = $1";
    }

    const query = `
      SELECT 
        l.id,
        l.session_id,
        l.admin_user_id,
        l.target_user_id,
        l.target_user_type,
        l.started_at,
        l.ended_at,
        l.reason,
        l.status,
        l.ip_address,
        l.actions_count,
        
        -- Admin user info
        a.email as admin_email,
        a.name as admin_name,
        
        -- Target user info (account or publisher)
        CASE 
          WHEN l.target_user_type = 'account' THEN ac.contact_name
          WHEN l.target_user_type = 'publisher' THEN COALESCE(p.first_name || ' ' || p.last_name, p.company_name)
        END as target_name,
        
        CASE 
          WHEN l.target_user_type = 'account' THEN ac.email
          WHEN l.target_user_type = 'publisher' THEN p.email
        END as target_email
        
      FROM impersonation_logs l
      JOIN users a ON l.admin_user_id = a.id
      LEFT JOIN accounts ac ON l.target_user_id = ac.id AND l.target_user_type = 'account'
      LEFT JOIN publishers p ON l.target_user_id = p.id AND l.target_user_type = 'publisher'
      WHERE 1=1 ${timeCondition} ${statusCondition}
      ORDER BY l.started_at DESC
      LIMIT 100
    `;

    const params = filter !== 'all' ? [filter] : [];
    const result = await pool.query(query, params);

    const logs = result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      adminUserId: row.admin_user_id,
      adminName: row.admin_name || 'Unknown Admin',
      adminEmail: row.admin_email || 'unknown@admin.com',
      targetUserId: row.target_user_id,
      targetName: row.target_name || 'Unknown User',
      targetEmail: row.target_email || 'unknown@user.com',
      targetUserType: row.target_user_type,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      reason: row.reason,
      status: row.status,
      actionsCount: row.actions_count || 0,
      ipAddress: row.ip_address || 'Unknown IP'
    }));

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length
    });

  } catch (error: any) {
    console.error('❌ Error fetching impersonation logs:', error);
    return NextResponse.json({
      error: 'Failed to fetch impersonation logs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}