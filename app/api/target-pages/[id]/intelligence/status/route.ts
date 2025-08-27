import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * GET /api/target-pages/[id]/intelligence/status
 * 
 * Polls the status of target page intelligence research and brief generation.
 * Used by the UI component for real-time status updates during long-running operations.
 * 
 * Query params:
 * - sessionId: string (optional - can lookup by target page ID)
 * 
 * Response:
 * - success: boolean
 * - status: ResearchStatus | BriefStatus
 * - progress?: string
 * - researchOutput?: ResearchOutput (when research completed)
 * - clientInput?: string (when input phase)
 * - finalBrief?: string (when brief completed)
 * - error?: string
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get target page ID from params
    const { id: targetPageId } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    // Authenticate user
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the target page intelligence session
    let targetPageIntelligenceSession;
    
    if (sessionId) {
      // Try to find by research session ID first, then by brief session ID, then by record ID
      const sessions = await db
        .select()
        .from(targetPageIntelligence)
        .where(eq(targetPageIntelligence.targetPageId, targetPageId))
        .limit(1);
        
      targetPageIntelligenceSession = sessions.find(s => 
        s.researchSessionId === sessionId || 
        s.briefSessionId === sessionId || 
        s.id === sessionId
      ) || sessions[0];
    } else {
      // Find by target page ID only
      const sessions = await db
        .select()
        .from(targetPageIntelligence)
        .where(eq(targetPageIntelligence.targetPageId, targetPageId))
        .limit(1);
        
      targetPageIntelligenceSession = sessions[0];
    }

    if (!targetPageIntelligenceSession) {
      return NextResponse.json(
        { success: false, error: 'Target page intelligence session not found' },
        { status: 404 }
      );
    }

    // Check for stuck sessions (over 45 minutes old)
    if (targetPageIntelligenceSession.researchStatus === 'in_progress' && 
        targetPageIntelligenceSession.researchStartedAt) {
      const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000);
      if (targetPageIntelligenceSession.researchStartedAt < fortyFiveMinutesAgo) {
        console.log('🧹 Found stuck research session, attempting recovery...');
        
        try {
          // Try to check if the research actually completed
          if (targetPageIntelligenceSession.researchSessionId) {
            // This would trigger recovery logic in the service
            const recoveryResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/target-pages/${targetPageId}/intelligence/start-research`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetPageUrl: 'unknown',
                sessionId: targetPageIntelligenceSession.researchSessionId
              })
            });
            
            if (recoveryResponse.ok) {
              console.log('✅ Recovery check completed, reloading session...');
              // Reload the session to get updated status
              const updatedSessions = await db
                .select()
                .from(targetPageIntelligence)
                .where(eq(targetPageIntelligence.targetPageId, targetPageId))
                .limit(1);
              
              if (updatedSessions.length > 0) {
                targetPageIntelligenceSession = updatedSessions[0];
              }
            }
          }
        } catch (recoveryError) {
          console.error('Recovery attempt failed:', recoveryError);
        }
      }
    }

    // Determine current phase and status
    const isResearchPhase = ['queued', 'in_progress'].includes(targetPageIntelligenceSession.researchStatus);
    const isBriefPhase = ['queued', 'in_progress'].includes(targetPageIntelligenceSession.briefStatus);
    
    let currentStatus = targetPageIntelligenceSession.researchStatus;
    let progress = '';

    // Generate progress message based on status
    if (isResearchPhase) {
      currentStatus = targetPageIntelligenceSession.researchStatus;
      switch (targetPageIntelligenceSession.researchStatus) {
        case 'queued':
          progress = 'Research queued, starting deep analysis...';
          break;
        case 'in_progress':
          progress = 'AI is conducting deep research on this target page (15-20 minutes)...';
          break;
        case 'completed':
          progress = 'Research completed! Ready for client input.';
          break;
        case 'error':
          progress = 'Research encountered an error.';
          break;
      }
    } else if (isBriefPhase) {
      currentStatus = targetPageIntelligenceSession.briefStatus;
      switch (targetPageIntelligenceSession.briefStatus) {
        case 'queued':
          progress = 'Brief generation queued...';
          break;
        case 'in_progress':
          progress = 'AI is generating comprehensive target page brief...';
          break;
        case 'completed':
          progress = 'Target page brief completed successfully!';
          break;
        case 'error':
          progress = 'Brief generation encountered an error.';
          break;
      }
    } else {
      // Determine what phase we should be in
      if (targetPageIntelligenceSession.researchStatus === 'completed' && !targetPageIntelligenceSession.clientInput) {
        progress = 'Waiting for client input to continue with brief generation.';
      } else if (targetPageIntelligenceSession.clientInput && targetPageIntelligenceSession.briefStatus === 'idle') {
        progress = 'Ready to generate comprehensive target page brief.';
      } else if (targetPageIntelligenceSession.briefStatus === 'completed') {
        progress = 'Target page intelligence completed! Brief is ready for use.';
      } else {
        progress = 'Ready to start research.';
      }
    }

    // Build response data
    const responseData: any = {
      success: true,
      status: currentStatus,
      progress,
      researchStatus: targetPageIntelligenceSession.researchStatus,
      briefStatus: targetPageIntelligenceSession.briefStatus
    };

    // Include phase-specific data
    if (targetPageIntelligenceSession.researchStatus === 'completed' && targetPageIntelligenceSession.researchOutput) {
      responseData.researchOutput = targetPageIntelligenceSession.researchOutput;
    }

    if (targetPageIntelligenceSession.clientInput) {
      responseData.clientInput = targetPageIntelligenceSession.clientInput;
    }

    if (targetPageIntelligenceSession.briefStatus === 'completed' && targetPageIntelligenceSession.finalBrief) {
      responseData.finalBrief = targetPageIntelligenceSession.finalBrief;
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Error checking target page intelligence status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check target page intelligence status',
        details: error.message
      },
      { status: 500 }
    );
  }
}