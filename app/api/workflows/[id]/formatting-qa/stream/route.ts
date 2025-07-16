import { NextRequest, NextResponse } from 'next/server';
import { addSSEConnection, removeSSEConnection } from '@/lib/services/agenticFormattingQAService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  console.log('SSE connection established for formatting QA session:', sessionId);

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Store the response object for SSE updates
      const res = {
        write: (message: string) => {
          controller.enqueue(encoder.encode(message));
        }
      };

      // Add connection to active streams
      addSSEConnection(sessionId, res);

      // Send initial connection message
      sendEvent({ type: 'connected', message: 'Connected to formatting QA stream' });

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        console.log('SSE connection closed for formatting QA session:', sessionId);
        removeSSEConnection(sessionId);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}