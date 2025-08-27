import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * POST /api/target-pages/[id]/intelligence/submit-input
 * 
 * Submits client input after research phase completion.
 * This is a one-time input that helps fill gaps identified during research.
 * 
 * Request body:
 * - clientInput: string (client's response to research gaps)
 * - sessionId?: string (optional - can lookup by target page ID)
 * 
 * Response:
 * - success: boolean
 * - message: string
 * - nextStep: 'generate_brief'
 * - error?: string
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get target page ID from params
    const { id: targetPageId } = await params;
    const body = await request.json();
    const { clientInput, sessionId } = body;
    
    // Validate input
    if (!clientInput || typeof clientInput !== 'string' || clientInput.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client input is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (clientInput.trim().length > 10000) { // 10k character limit
      return NextResponse.json(
        { success: false, error: 'Client input too long. Maximum 10,000 characters allowed.' },
        { status: 400 }
      );
    }
    
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
      // Try to find by session ID
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

    // Validate that research is completed
    if (targetPageIntelligenceSession.researchStatus !== 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Research must be completed before submitting client input',
          currentStatus: targetPageIntelligenceSession.researchStatus
        },
        { status: 400 }
      );
    }

    // Check if client input was already submitted (one-time only)
    if (targetPageIntelligenceSession.clientInput && targetPageIntelligenceSession.clientInputAt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client input has already been submitted. This is a one-time input only.',
          submittedAt: targetPageIntelligenceSession.clientInputAt
        },
        { status: 400 }
      );
    }

    // Update the session with client input
    await db
      .update(targetPageIntelligence)
      .set({
        clientInput: clientInput.trim(),
        clientInputAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(targetPageIntelligence.id, targetPageIntelligenceSession.id));

    return NextResponse.json({
      success: true,
      message: 'Client input submitted successfully',
      nextStep: 'generate_brief'
    });

  } catch (error: any) {
    console.error('Error submitting client input:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit client input',
        details: error.message
      },
      { status: 500 }
    );
  }
}