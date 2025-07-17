import { NextRequest, NextResponse } from 'next/server';
import { DiagnosticStorageService } from '@/lib/services/diagnosticStorageService';

/**
 * GET /api/admin/agent-diagnostics/sessions/[sessionId]
 * Returns diagnostic events for a specific session
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const params = await context.params;
    const { sessionId } = params;

    const { session, events } = DiagnosticStorageService.getSessionDetails(sessionId);

    if (!session) {
      return NextResponse.json({
        error: 'Session not found',
        sessionId
      }, { status: 404 });
    }

    return NextResponse.json({
      session,
      events,
      eventCount: events.length
    });

  } catch (error) {
    console.error('Error fetching diagnostic session details:', error);
    return NextResponse.json({
      error: 'Failed to fetch session details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}