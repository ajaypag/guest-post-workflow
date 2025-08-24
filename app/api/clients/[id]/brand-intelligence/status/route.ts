import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * GET /api/clients/[id]/brand-intelligence/status
 * 
 * Polls the status of brand intelligence research and brief generation.
 * Used by the UI component for real-time status updates during long-running operations.
 * 
 * Query params:
 * - sessionId: string (optional - can lookup by client ID)
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
    // Get client ID from params
    const { id: clientId } = await params;
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

    // Find the brand intelligence session
    let brandIntelligenceSession;
    
    if (sessionId) {
      // Try to find by research session ID first, then by brief session ID, then by record ID
      const sessions = await db
        .select()
        .from(clientBrandIntelligence)
        .where(eq(clientBrandIntelligence.clientId, clientId))
        .limit(1);
        
      brandIntelligenceSession = sessions.find(s => 
        s.researchSessionId === sessionId || 
        s.briefSessionId === sessionId || 
        s.id === sessionId
      ) || sessions[0];
    } else {
      // Find by client ID only
      const sessions = await db
        .select()
        .from(clientBrandIntelligence)
        .where(eq(clientBrandIntelligence.clientId, clientId))
        .limit(1);
        
      brandIntelligenceSession = sessions[0];
    }

    if (!brandIntelligenceSession) {
      return NextResponse.json(
        { success: false, error: 'Brand intelligence session not found' },
        { status: 404 }
      );
    }

    // Check for stuck sessions (over 45 minutes old)
    if (brandIntelligenceSession.researchStatus === 'in_progress' && 
        brandIntelligenceSession.researchStartedAt) {
      const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000);
      if (brandIntelligenceSession.researchStartedAt < fortyFiveMinutesAgo) {
        console.log('🧹 Found stuck research session, attempting recovery...');
        
        try {
          // Try to check if the research actually completed
          if (brandIntelligenceSession.researchSessionId) {
            // This would trigger recovery logic in the service
            const recoveryResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/clients/${clientId}/brand-intelligence/start-research`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientWebsite: 'unknown',
                sessionId: brandIntelligenceSession.researchSessionId
              })
            });
            
            if (recoveryResponse.ok) {
              console.log('✅ Recovery check completed, reloading session...');
              // Reload the session to get updated status
              const updatedSessions = await db
                .select()
                .from(clientBrandIntelligence)
                .where(eq(clientBrandIntelligence.clientId, clientId))
                .limit(1);
              
              if (updatedSessions.length > 0) {
                brandIntelligenceSession = updatedSessions[0];
              }
            }
          }
        } catch (recoveryError) {
          console.error('Recovery attempt failed:', recoveryError);
        }
      }
    }

    // Determine current phase and status
    const isResearchPhase = ['queued', 'in_progress'].includes(brandIntelligenceSession.researchStatus);
    const isBriefPhase = ['queued', 'in_progress'].includes(brandIntelligenceSession.briefStatus);
    
    let currentStatus = brandIntelligenceSession.researchStatus;
    let progress = '';

    // Generate progress message based on status
    if (isResearchPhase) {
      currentStatus = brandIntelligenceSession.researchStatus;
      switch (brandIntelligenceSession.researchStatus) {
        case 'queued':
          progress = 'Research queued, starting deep analysis...';
          break;
        case 'in_progress':
          progress = 'AI is conducting deep research on your business (15-20 minutes)...';
          break;
        case 'completed':
          progress = 'Research completed! Ready for client input.';
          break;
        case 'error':
          progress = 'Research encountered an error.';
          break;
      }
    } else if (isBriefPhase) {
      currentStatus = brandIntelligenceSession.briefStatus;
      switch (brandIntelligenceSession.briefStatus) {
        case 'queued':
          progress = 'Brief generation queued...';
          break;
        case 'in_progress':
          progress = 'AI is generating comprehensive brand brief...';
          break;
        case 'completed':
          progress = 'Brand brief completed successfully!';
          break;
        case 'error':
          progress = 'Brief generation encountered an error.';
          break;
      }
    } else {
      // Determine what phase we should be in
      if (brandIntelligenceSession.researchStatus === 'completed' && !brandIntelligenceSession.clientInput) {
        progress = 'Waiting for client input to continue with brief generation.';
      } else if (brandIntelligenceSession.clientInput && brandIntelligenceSession.briefStatus === 'idle') {
        progress = 'Ready to generate comprehensive brand brief.';
      } else if (brandIntelligenceSession.briefStatus === 'completed') {
        progress = 'Brand intelligence completed! Brief is ready for use.';
      } else {
        progress = 'Ready to start research.';
      }
    }

    // Build response data
    const responseData: any = {
      success: true,
      status: currentStatus,
      progress,
      researchStatus: brandIntelligenceSession.researchStatus,
      briefStatus: brandIntelligenceSession.briefStatus
    };

    // Include phase-specific data
    if (brandIntelligenceSession.researchStatus === 'completed' && brandIntelligenceSession.researchOutput) {
      responseData.researchOutput = brandIntelligenceSession.researchOutput;
    }

    if (brandIntelligenceSession.clientInput) {
      responseData.clientInput = brandIntelligenceSession.clientInput;
    }

    if (brandIntelligenceSession.briefStatus === 'completed' && brandIntelligenceSession.finalBrief) {
      responseData.finalBrief = brandIntelligenceSession.finalBrief;
    }

    // Error field removed from schema
    // if (brandIntelligenceSession.lastError) {
    //   responseData.error = brandIntelligenceSession.lastError;
    // }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Error checking brand intelligence status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check brand intelligence status',
        details: error.message
      },
      { status: 500 }
    );
  }
}