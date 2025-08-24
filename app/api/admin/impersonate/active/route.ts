/**
 * API Endpoint: Get Active Impersonation Sessions
 * 
 * GET /api/admin/impersonate/active
 * 
 * Returns all currently active impersonation sessions (admin only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { ImpersonationService } from '@/lib/services/impersonationService';

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await AuthServiceServer.getSession(request);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized - No valid session found' 
      }, { status: 401 });
    }
    
    // Verify admin role (and not currently impersonating)
    if (session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden - Admin role required' 
      }, { status: 403 });
    }
    
    // Get all active impersonation sessions
    const activeSessions = await ImpersonationService.getActiveSessions();
    
    // Format response
    const formattedSessions = activeSessions.map(session => ({
      id: session.id,
      adminUserId: session.adminUserId,
      targetUserId: session.targetUserId,
      targetUserType: session.targetUserType,
      startedAt: session.startedAt,
      reason: session.reason,
      actionsCount: session.actionsCount,
      duration: Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60) + ' minutes',
      ipAddress: session.ipAddress
    }));
    
    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      count: formattedSessions.length
    });
    
  } catch (error: any) {
    console.error('❌ Get active sessions error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to get active sessions',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}