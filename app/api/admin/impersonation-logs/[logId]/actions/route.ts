/**
 * API Endpoint: Impersonation Actions for a Log
 * 
 * GET /api/admin/impersonation-logs/[logId]/actions
 * 
 * Fetches all actions performed during a specific impersonation session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { getSessionPool } from '@/lib/db/sessionPool';

const pool = getSessionPool();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  // Await params in Next.js 15
  const { logId } = await params;
  try {
    // Check admin permissions
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ 
        error: 'Admin access required' 
      }, { status: 403 });
    }

    if (!logId) {
      return NextResponse.json({
        error: 'Log ID is required'
      }, { status: 400 });
    }

    const query = `
      SELECT 
        id,
        log_id,
        action_type,
        endpoint,
        method,
        request_data,
        response_status,
        timestamp
      FROM impersonation_actions
      WHERE log_id = $1
      ORDER BY timestamp DESC
      LIMIT 500
    `;

    const result = await pool.query(query, [logId]);

    const actions = result.rows.map(row => ({
      id: row.id,
      logId: row.log_id,
      actionType: row.action_type,
      endpoint: row.endpoint,
      method: row.method,
      requestData: row.request_data ? JSON.parse(row.request_data) : null,
      responseStatus: row.response_status,
      timestamp: row.timestamp
    }));

    return NextResponse.json({
      success: true,
      actions,
      total: actions.length
    });

  } catch (error: any) {
    console.error('❌ Error fetching impersonation actions:', error);
    return NextResponse.json({
      error: 'Failed to fetch impersonation actions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}