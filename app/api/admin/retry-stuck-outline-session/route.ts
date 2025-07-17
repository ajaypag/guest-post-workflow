import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { outlineSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Attempting to retry stuck session ${sessionId}`);

    // Get the session
    const session = await db.query.outlineSessions.findFirst({
      where: eq(outlineSessions.id, sessionId)
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if it has a background response ID
    if (!session.backgroundResponseId) {
      return NextResponse.json(
        { error: 'No background response ID found. Cannot retry.' },
        { status: 400 }
      );
    }

    const result: any = {
      sessionId,
      originalStatus: session.status,
      pollingAttempts: session.pollingAttempts,
      ageMinutes: Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000),
      action: 'none',
      newStatus: session.status
    };

    try {
      // Try to check the status again with OpenAI
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      console.log(`📊 Checking status of background response ${session.backgroundResponseId}`);
      const response = await openai.responses.retrieve(session.backgroundResponseId);
      
      result.openAIStatus = response.status;

      // Update the session with the latest status
      await db.update(outlineSessions)
        .set({
          status: response.status || session.status,
          pollingAttempts: (session.pollingAttempts || 0) + 1,
          lastPolledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      result.action = 'status_updated';
      result.newStatus = response.status || session.status;

      // If it's completed, we should process the result
      if (response.status === 'completed' && response.output) {
        // The normal polling mechanism should pick this up
        result.action = 'completed_found';
        result.note = 'The session was actually completed. Normal polling should process it.';
      }

      // If it's failed or cancelled, mark it as inactive
      if (response.status === 'failed' || response.status === 'cancelled') {
        await db.update(outlineSessions)
          .set({
            status: 'error',
            errorMessage: `OpenAI response ${response.status}`,
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(outlineSessions.id, sessionId));

        result.action = 'marked_as_failed';
      }

    } catch (error: any) {
      console.error('Error checking with OpenAI:', error);
      result.openAIError = error.message;

      // If we can't check with OpenAI and it's been stuck for over 30 minutes, mark it as failed
      if (result.ageMinutes > 30) {
        await db.update(outlineSessions)
          .set({
            status: 'error',
            errorMessage: 'Session timed out after 30 minutes',
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(outlineSessions.id, sessionId));

        result.action = 'timed_out';
        result.newStatus = 'error';
      }
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('❌ Error retrying session:', error);
    return NextResponse.json(
      { error: 'Failed to retry session', details: error },
      { status: 500 }
    );
  }
}