/**
 * API Endpoint: Start Impersonation
 * 
 * POST /api/admin/impersonate/start
 * 
 * Starts an impersonation session for an admin user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { ImpersonationService } from '@/lib/services/impersonationService';

export async function POST(request: NextRequest) {
  try {
    // Get current session state
    const sessionState = await AuthServiceServer.getSessionState(request);
    
    if (!sessionState) {
      return NextResponse.json({ 
        error: 'Unauthorized - No valid session found' 
      }, { status: 401 });
    }
    
    // Verify admin role
    if (sessionState.currentUser.userType !== 'internal' || 
        sessionState.currentUser.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden - Admin role required' 
      }, { status: 403 });
    }
    
    // Check if already impersonating
    if (sessionState.impersonation?.isActive) {
      return NextResponse.json({ 
        error: 'Already impersonating another user. End current session first.' 
      }, { status: 400 });
    }
    
    // Get request body
    const body = await request.json();
    const { targetUserId, targetUserType, reason } = body;
    
    // Validate input
    if (!targetUserId || !reason || reason.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Target user ID and detailed reason (min 10 chars) are required' 
      }, { status: 400 });
    }
    
    if (!['account', 'publisher'].includes(targetUserType)) {
      return NextResponse.json({ 
        error: 'Invalid target user type. Must be "account" or "publisher"' 
      }, { status: 400 });
    }
    
    console.log('🎭 Starting impersonation', {
      admin: sessionState.currentUser.email,
      targetUserId,
      targetUserType,
      reasonLength: reason.length
    });
    
    // Start impersonation
    const log = await ImpersonationService.startImpersonation(
      sessionState.id,
      targetUserId,
      reason.trim()
    );
    
    console.log('✅ Impersonation started successfully', {
      logId: log.id,
      adminId: sessionState.currentUser.userId,
      targetId: targetUserId
    });
    
    return NextResponse.json({
      success: true,
      logId: log.id,
      message: 'Impersonation started successfully',
      targetUser: {
        id: targetUserId,
        type: targetUserType
      }
    });
    
  } catch (error: any) {
    console.error('❌ Start impersonation error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to start impersonation',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 400 });
  }
}