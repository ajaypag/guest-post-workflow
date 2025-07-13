import { NextRequest } from 'next/server';
import { agenticArticleService } from '@/lib/services/agenticArticleService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workflowId } = await params;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendEvent({ type: 'connected', sessionId });

      // Poll for progress updates every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const progress = await agenticArticleService.getSessionProgress(sessionId);
          
          if (!progress) {
            sendEvent({ type: 'error', message: 'Session not found' });
            clearInterval(pollInterval);
            controller.close();
            return;
          }

          sendEvent({
            type: 'progress',
            session: progress.session,
            sections: progress.sections,
            progress: progress.progress
          });

          // Close stream when generation is complete or failed
          if (progress.session.status === 'completed' || progress.session.status === 'error') {
            sendEvent({ 
              type: 'complete', 
              status: progress.session.status,
              errorMessage: progress.session.errorMessage 
            });
            clearInterval(pollInterval);
            controller.close();
          }

        } catch (error) {
          console.error('Error polling progress:', error);
          sendEvent({ type: 'error', message: 'Failed to get progress' });
          clearInterval(pollInterval);
          controller.close();
        }
      }, 2000);

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
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