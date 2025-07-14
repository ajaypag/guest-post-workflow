import { NextRequest } from 'next/server';
import { agenticFinalPolishService } from '@/lib/services/agenticFinalPolishService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to polish progress updates
      agenticFinalPolishService.subscribe(sessionId, (data) => {
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));

          // Close stream on completion or error
          if (data.type === 'completed' || data.type === 'error') {
            setTimeout(() => {
              try {
                controller.close();
                agenticFinalPolishService.unsubscribe(sessionId);
              } catch (e) {
                console.error('Error closing SSE stream:', e);
              }
            }, 1000); // Small delay to ensure message is sent
          }
        } catch (error) {
          console.error('Error in SSE stream:', error);
          controller.error(error);
        }
      });

      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        message: 'Connected to final polish stream'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectMessage));

      // Send current progress if available
      agenticFinalPolishService.getPolishProgress(sessionId)
        .then(progress => {
          const progressMessage = `data: ${JSON.stringify({
            type: 'progress',
            progress
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(progressMessage));
        })
        .catch(error => {
          console.error('Error getting initial progress:', error);
          // Don't fail the stream for this
        });
    },

    cancel() {
      // Cleanup when client disconnects
      agenticFinalPolishService.unsubscribe(sessionId);
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
    }
  });
}