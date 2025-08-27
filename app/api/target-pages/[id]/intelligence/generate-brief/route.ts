import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { targetPageIntelligenceService } from '@/lib/services/targetPageIntelligenceService';

/**
 * POST /api/target-pages/[id]/intelligence/generate-brief
 * 
 * Triggers brief generation after client input has been submitted.
 * Synthesizes research output + client input into comprehensive target page brief.
 * 
 * Request body:
 * - sessionId?: string (optional - can lookup by target page ID)
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
    // Get target page ID from params
    const { id: targetPageId } = await params;
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

    // Validate prerequisites
    if (targetPageIntelligenceSession.researchStatus !== 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Research must be completed before generating brief',
          currentResearchStatus: targetPageIntelligenceSession.researchStatus
        },
        { status: 400 }
      );
    }

    if (!targetPageIntelligenceSession.clientInput || !targetPageIntelligenceSession.clientInputAt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client input must be submitted before generating brief'
        },
        { status: 400 }
      );
    }

    // Check if brief generation is already active
    if (['queued', 'in_progress'].includes(targetPageIntelligenceSession.briefStatus)) {
      return NextResponse.json({
        success: true,
        briefSessionId: targetPageIntelligenceSession.briefSessionId || targetPageIntelligenceSession.id,
        status: 'already_active',
        message: 'Brief generation is already in progress'
      });
    }

    // Generate new brief session ID
    const newBriefSessionId = crypto.randomUUID();

    // Update session to start brief generation
    await db
      .update(targetPageIntelligence)
      .set({
        briefSessionId: newBriefSessionId,
        briefStatus: 'queued',
        briefGeneratedAt: null, // Will be set when completed
        updatedAt: new Date()
      })
      .where(eq(targetPageIntelligence.id, targetPageIntelligenceSession.id));

    // Start brief generation asynchronously with better error handling
    targetPageIntelligenceService.generateBrief(
      targetPageId,
      newBriefSessionId
    ).then(() => {
      console.log('✅ Brief generation completed successfully for target page:', targetPageId);
    }).catch(async (error) => {
      console.error('❌ Background brief generation failed:', error);
      // Update the database to reflect the error
      try {
        await db
          .update(targetPageIntelligence)
          .set({
            briefStatus: 'error',
            updatedAt: new Date()
          })
          .where(eq(targetPageIntelligence.id, targetPageIntelligenceSession.id));
      } catch (dbError) {
        console.error('Failed to update error status:', dbError);
      }
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