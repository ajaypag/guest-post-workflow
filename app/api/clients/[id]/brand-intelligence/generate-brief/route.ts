import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { brandIntelligenceService } from '@/lib/services/brandIntelligenceService';

/**
 * POST /api/clients/[id]/brand-intelligence/generate-brief
 * 
 * Triggers brief generation after client input has been submitted.
 * Synthesizes research output + client input into comprehensive brand brief.
 * 
 * Request body:
 * - sessionId?: string (optional - can lookup by client ID)
 * 
 * Response:
 * - success: boolean
 * - briefSessionId: string
 * - status: 'queued' | 'already_active'
 * - message: string
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
    const { sessionId } = body;
    
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

    // Validate prerequisites
    if (brandIntelligenceSession.researchStatus !== 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Research must be completed before generating brief',
          currentResearchStatus: brandIntelligenceSession.researchStatus
        },
        { status: 400 }
      );
    }

    if (!brandIntelligenceSession.clientInput || !brandIntelligenceSession.clientInputAt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client input must be submitted before generating brief'
        },
        { status: 400 }
      );
    }

    // Check if brief generation is already active
    if (['queued', 'in_progress'].includes(brandIntelligenceSession.briefStatus)) {
      return NextResponse.json({
        success: true,
        briefSessionId: brandIntelligenceSession.briefSessionId || brandIntelligenceSession.id,
        status: 'already_active',
        message: 'Brief generation is already in progress'
      });
    }

    // Generate new brief session ID
    const newBriefSessionId = crypto.randomUUID();

    // Update session to start brief generation
    await db
      .update(clientBrandIntelligence)
      .set({
        briefSessionId: newBriefSessionId,
        briefStatus: 'queued',
        briefGeneratedAt: null, // Will be set when completed
        updatedAt: new Date()
      })
      .where(eq(clientBrandIntelligence.id, brandIntelligenceSession.id));

    // Start brief generation asynchronously
    brandIntelligenceService.generateBrief(
      clientId,
      newBriefSessionId
    ).catch(error => {
      console.error('Background brief generation failed:', error);
    });

    return NextResponse.json({
      success: true,
      briefSessionId: newBriefSessionId,
      status: 'queued',
      message: 'Brief generation started successfully'
    });

  } catch (error: any) {
    console.error('Error starting brief generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start brief generation',
        details: error.message
      },
      { status: 500 }
    );
  }
}