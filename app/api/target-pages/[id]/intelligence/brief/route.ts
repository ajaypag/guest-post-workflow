import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * PATCH /api/target-pages/[id]/intelligence/brief
 * 
 * Updates the final target page brief manually.
 * Allows clients to edit the AI-generated brief without expensive re-runs.
 * 
 * Request body:
 * - finalBrief: string (updated brief content)
 * - sessionId?: string (optional - can lookup by target page ID)
 * 
 * Response:
 * - success: boolean
 * - message: string
 * - error?: string
 * 
 * GET /api/target-pages/[id]/intelligence/brief
 * 
 * Retrieves the current final target page brief.
 * 
 * Query params:
 * - sessionId?: string (optional - can lookup by target page ID)
 * 
 * Response:
 * - success: boolean
 * - finalBrief: string | null
 * - lastUpdated: string | null
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

    return NextResponse.json({
      success: true,
      finalBrief: targetPageIntelligenceSession.finalBrief,
      lastUpdated: targetPageIntelligenceSession.briefGeneratedAt ? targetPageIntelligenceSession.briefGeneratedAt.toISOString() : null,
      briefStatus: targetPageIntelligenceSession.briefStatus
    });

  } catch (error: any) {
    console.error('Error retrieving target page brief:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve target page brief',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get target page ID from params
    const { id: targetPageId } = await params;
    const body = await request.json();
    const { finalBrief, sessionId } = body;
    
    // Validate input
    if (!finalBrief || typeof finalBrief !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Final brief content is required' },
        { status: 400 }
      );
    }

    if (finalBrief.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Final brief cannot be empty' },
        { status: 400 }
      );
    }

    if (finalBrief.trim().length > 50000) { // 50k character limit
      return NextResponse.json(
        { success: false, error: 'Final brief too long. Maximum 50,000 characters allowed.' },
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

    // Update the final brief
    await db
      .update(targetPageIntelligence)
      .set({
        finalBrief: finalBrief.trim(),
        updatedAt: new Date()
      })
      .where(eq(targetPageIntelligence.id, targetPageIntelligenceSession.id));

    return NextResponse.json({
      success: true,
      message: 'Target page brief updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating target page brief:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update target page brief',
        details: error.message
      },
      { status: 500 }
    );
  }
}