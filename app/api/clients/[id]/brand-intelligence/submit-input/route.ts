import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * POST /api/clients/[id]/brand-intelligence/submit-input
 * 
 * Submits client input after research phase completion.
 * This is a one-time input that helps fill gaps identified during research.
 * 
 * Request body:
 * - clientInput: string (client's response to research gaps)
 * - sessionId?: string (optional - can lookup by client ID)
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
    // Get client ID from params
    const { id: clientId } = await params;
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

    // Find the brand intelligence session
    let brandIntelligenceSession;
    
    if (sessionId) {
      // Try to find by session ID
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

    // Validate that research is completed
    if (brandIntelligenceSession.researchStatus !== 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Research must be completed before submitting client input',
          currentStatus: brandIntelligenceSession.researchStatus
        },
        { status: 400 }
      );
    }

    // Check if client input was already submitted (one-time only)
    if (brandIntelligenceSession.clientInput && brandIntelligenceSession.clientInputAt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client input has already been submitted. This is a one-time input only.',
          submittedAt: brandIntelligenceSession.clientInputAt
        },
        { status: 400 }
      );
    }

    // Update the session with client input
    await db
      .update(clientBrandIntelligence)
      .set({
        clientInput: clientInput.trim(),
        clientInputAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(clientBrandIntelligence.id, brandIntelligenceSession.id));

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