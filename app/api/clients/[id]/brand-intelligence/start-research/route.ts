import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { brandIntelligenceService } from '@/lib/services/brandIntelligenceService';

/**
 * POST /api/clients/[id]/brand-intelligence/start-research
 * 
 * Triggers OpenAI Deep Research for a client's business.
 * Creates a new brand intelligence session or resumes an existing one.
 * 
 * Flow:
 * 1. Check if there's already an active research session
 * 2. If yes, return existing session details
 * 3. If no, create new session and start Deep Research
 * 
 * Response:
 * - success: boolean
 * - sessionId: string
 * - status: 'new' | 'already_active' | 'resumed'
 * - existingSessionId?: string (if resuming)
 * - error?: string
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get client ID from params
    const { id: clientId } = await params;
    
    // Authenticate user
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First, verify the client exists and get client details
    const clientResults = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (clientResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    const client = clientResults[0];
    
    // Check if there's already an existing brand intelligence session
    const existingSessions = await db
      .select()
      .from(clientBrandIntelligence)
      .where(eq(clientBrandIntelligence.clientId, clientId))
      .limit(1);

    const existingSession = existingSessions[0];

    // If there's an active research session, return it
    if (existingSession && ['queued', 'in_progress'].includes(existingSession.researchStatus)) {
      return NextResponse.json({
        success: true,
        sessionId: existingSession.researchSessionId || existingSession.id,
        status: 'already_active',
        existingSessionId: existingSession.id
      });
    }

    // Generate a new research session ID (OpenAI session ID will be set later)
    const newSessionId = crypto.randomUUID();

    if (existingSession) {
      // Update existing session to start new research
      await db
        .update(clientBrandIntelligence)
        .set({
          researchSessionId: newSessionId,
          researchStatus: 'queued',
          researchStartedAt: new Date(),
          researchCompletedAt: null,
          researchOutput: null,
          updatedAt: new Date()
        })
        .where(eq(clientBrandIntelligence.id, existingSession.id));

      // Start the research process asynchronously
      brandIntelligenceService.conductResearch(
        clientId,
        client.website || '',
        newSessionId
      ).catch(error => {
        console.error('Background research failed:', error);
      });

      return NextResponse.json({
        success: true,
        sessionId: newSessionId,
        status: 'resumed',
        existingSessionId: existingSession.id
      });
    } else {
      // Create new brand intelligence session
      const [newSession] = await db
        .insert(clientBrandIntelligence)
        .values({
          clientId: clientId,
          researchSessionId: newSessionId,
          researchStatus: 'queued',
          researchStartedAt: new Date(),
          briefStatus: 'idle',
          createdBy: session.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Start the research process asynchronously
      brandIntelligenceService.conductResearch(
        clientId,
        client.website || '',
        newSessionId
      ).catch(error => {
        console.error('Background research failed:', error);
      });

      return NextResponse.json({
        success: true,
        sessionId: newSessionId,
        status: 'new',
        existingSessionId: newSession.id
      });
    }

  } catch (error: any) {
    console.error('Error starting brand intelligence research:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start brand intelligence research',
        details: error.message
      },
      { status: 500 }
    );
  }
}