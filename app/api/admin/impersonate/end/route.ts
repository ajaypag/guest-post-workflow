/**
 * API Endpoint: End Impersonation
 * 
 * POST /api/admin/impersonate/end
 * 
 * Ends the current impersonation session and restores admin access.
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
        error: 'No valid session found' 
      }, { status: 401 });
    }
    
    // Check if currently impersonating
    if (!sessionState.impersonation?.isActive) {
      return NextResponse.json({ 
        error: 'No active impersonation found' 
      }, { status: 400 });
    }
    
    console.log('🎭 Ending impersonation', {
      logId: sessionState.impersonation.logId,
      admin: sessionState.impersonation.adminUser.email,
      target: sessionState.impersonation.targetUser.email,
      duration: Math.round((Date.now() - new Date(sessionState.impersonation.startedAt).getTime()) / 1000 / 60) + ' minutes'
    });
    
    // End impersonation
    await ImpersonationService.endImpersonation(sessionState.id);
    
    console.log('✅ Impersonation ended successfully', {
      sessionId: sessionState.id,
      restoredAdmin: sessionState.impersonation.adminUser.email
    });
    
    return NextResponse.json({
      success: true,
      message: 'Impersonation ended successfully',
      redirectUrl: '/accounts' // Redirect back to accounts page
    });
    
  } catch (error: any) {
    console.error('❌ End impersonation error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to end impersonation',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 400 });
  }
}