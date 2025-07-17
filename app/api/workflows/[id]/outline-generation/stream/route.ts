import { NextRequest } from 'next/server';
import { addSSEConnection, removeSSEConnection } from '@/lib/services/agenticOutlineServiceV3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  // Set up Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        message: 'Connected to streaming outline generation',
        timestamp: new Date().toISOString()
      })}\n\n`;
      
      controller.enqueue(encoder.encode(initialMessage));

      // Create a response object-like interface for our SSE system
      const res = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('Error writing to SSE stream:', error);
          }
        },
        end: () => {
          try {
            controller.close();
          } catch (error) {
            console.error('Error closing SSE stream:', error);
          }
        }
      };

      // Register this connection
      addSSEConnection(sessionId, res);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`🔌 Client disconnected from session ${sessionId}`);
        removeSSEConnection(sessionId);
        try {
          controller.close();
        } catch (error) {
          // Stream already closed
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    },
  });
}