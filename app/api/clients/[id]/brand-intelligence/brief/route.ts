import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * PATCH /api/clients/[id]/brand-intelligence/brief
 * 
 * Updates the final brand brief manually.
 * Allows clients to edit the AI-generated brief without expensive re-runs.
 * 
 * Request body:
 * - finalBrief: string (updated brief content)
 * - sessionId?: string (optional - can lookup by client ID)
 * 
 * Response:
 * - success: boolean
 * - message: string
 * - error?: string
 * 
 * GET /api/clients/[id]/brand-intelligence/brief
 * 
 * Retrieves the current final brand brief.
 * 
 * Query params:
 * - sessionId?: string (optional - can lookup by client ID)
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

    return NextResponse.json({
      success: true,
      finalBrief: brandIntelligenceSession.finalBrief,
      lastUpdated: brandIntelligenceSession.briefGeneratedAt ? brandIntelligenceSession.briefGeneratedAt.toISOString() : null,
      briefStatus: brandIntelligenceSession.briefStatus
    });

  } catch (error: any) {
    console.error('Error retrieving brand brief:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve brand brief',
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
    // Get client ID from params
    const { id: clientId } = await params;
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

    // Find the brand intelligence session
    let brandIntelligenceSession;
    
    if (sessionId) {
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

    // Update the final brief
    await db
      .update(clientBrandIntelligence)
      .set({
        finalBrief: finalBrief.trim(),
        updatedAt: new Date()
      })
      .where(eq(clientBrandIntelligence.id, brandIntelligenceSession.id));

    return NextResponse.json({
      success: true,
      message: 'Brand brief updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating brand brief:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update brand brief',
        details: error.message
      },
      { status: 500 }
    );
  }
}