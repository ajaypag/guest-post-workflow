import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { targetPageIntelligenceService } from '@/lib/services/targetPageIntelligenceService';

/**
 * POST /api/target-pages/[id]/intelligence/start-research
 * 
 * Triggers OpenAI Deep Research for a specific target page.
 * Creates a new target page intelligence session or resumes an existing one.
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
    // Get target page ID from params
    const { id: targetPageId } = await params;
    
    // Authenticate user
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First, verify the target page exists and get target page details
    const targetPageResults = await db
      .select()
      .from(targetPages)
      .where(eq(targetPages.id, targetPageId))
      .limit(1);

    if (targetPageResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Target page not found' },
        { status: 404 }
      );
    }

    const targetPage = targetPageResults[0];
    
    // Check if there's already an existing target page intelligence session
    const existingSessions = await db
      .select()
      .from(targetPageIntelligence)
      .where(eq(targetPageIntelligence.targetPageId, targetPageId))
      .limit(1);

    const existingSession = existingSessions[0];

    // Check existing session status
    if (existingSession) {
      // If research is completed, don't allow restart
      if (existingSession.researchStatus === 'completed') {
        return NextResponse.json({
          success: false,
          error: 'Research already completed for this target page',
          status: 'already_completed',
          existingSessionId: existingSession.id
        });
      }
      
      // If there's an active research session, return it
      if (['queued', 'in_progress'].includes(existingSession.researchStatus)) {
        return NextResponse.json({
          success: true,
          sessionId: existingSession.researchSessionId || existingSession.id,
          status: 'already_active',
          existingSessionId: existingSession.id
        });
      }
    }

    // Generate a new research session ID (OpenAI session ID will be set later)
    const newSessionId = crypto.randomUUID();

    if (existingSession) {
      // Update existing session to start new research
      await db
        .update(targetPageIntelligence)
        .set({
          researchSessionId: newSessionId,
          researchStatus: 'queued',
          researchStartedAt: new Date(),
          researchCompletedAt: null,
          researchOutput: null,
          updatedAt: new Date()
        })
        .where(eq(targetPageIntelligence.id, existingSession.id));

      // Start the research process asynchronously
      targetPageIntelligenceService.conductResearch(
        targetPageId,
        targetPage.url || '',
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
      // Create new target page intelligence session
      const [newSession] = await db
        .insert(targetPageIntelligence)
        .values({
          clientId: targetPage.clientId,
          targetPageId: targetPageId,
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
      targetPageIntelligenceService.conductResearch(
        targetPageId,
        targetPage.url || '',
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
    console.error('Error starting target page intelligence research:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start target page intelligence research',
        details: error.message
      },
      { status: 500 }
    );
  }
}