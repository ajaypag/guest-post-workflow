import { NextRequest } from 'next/server';
import { addPolishSSEConnection, removePolishSSEConnection } from '@/lib/services/agenticFinalPolishService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  console.log(`🔄 SSE stream requested for polish session: ${sessionId}`);

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Mock response object for SSE
      const mockRes = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('SSE write error:', error);
          }
        },
        end: () => {
          try {
            controller.close();
          } catch (error) {
            console.error('SSE close error:', error);
          }
        }
      };

      // Add to active connections
      addPolishSSEConnection(sessionId, mockRes);

      // Send initial connection confirmation
      mockRes.write(`data: ${JSON.stringify({ 
        type: 'connected', 
        sessionId,
        message: 'Final polish stream connected' 
      })}\n\n`);

      // Cleanup on disconnect
      const cleanup = () => {
        console.log(`🔌 Removing polish SSE connection: ${sessionId}`);
        removePolishSSEConnection(sessionId);
      };

      // Handle stream abort
      const abortHandler = () => {
        cleanup();
      };

      // Setup cleanup
      if (request.signal) {
        request.signal.addEventListener('abort', abortHandler);
      }

      // Store cleanup function for later use
      (mockRes as any).cleanup = cleanup;
    },

    cancel() {
      console.log(`❌ Polish SSE stream cancelled for session: ${sessionId}`);
      removePolishSSEConnection(sessionId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}