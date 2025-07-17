import { NextRequest, NextResponse } from 'next/server';
import { 
  agenticOutlineService, 
  addSSEConnection, 
  removeSSEConnection 
} from '@/lib/services/agenticOutlineService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    );
  }

  console.log(`🔄 SSE connection established for outline session ${sessionId}`);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Store the response writer for SSE pushes
      const responseWriter = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('SSE write error:', error);
          }
        }
      };

      // Register this connection
      addSSEConnection(sessionId, responseWriter);

      // Send initial connection event
      const connectMessage = `data: ${JSON.stringify({ 
        type: 'connected', 
        sessionId 
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // Set up periodic progress checks
      const pollInterval = setInterval(async () => {
        try {
          const progress = await agenticOutlineService.getSessionProgress(sessionId);
          
          if (progress.error) {
            const errorMessage = `data: ${JSON.stringify({ 
              type: 'error', 
              error: progress.error 
            })}\n\n`;
            controller.enqueue(encoder.encode(errorMessage));
            clearInterval(pollInterval);
            removeSSEConnection(sessionId);
            controller.close();
            return;
          }

          // Send progress update
          const progressMessage = `data: ${JSON.stringify(progress)}\n\n`;
          controller.enqueue(encoder.encode(progressMessage));

          // Close stream when completed or errored
          if (progress.status === 'completed' || progress.status === 'error') {
            clearInterval(pollInterval);
            removeSSEConnection(sessionId);
            
            // Send final event
            const doneMessage = `data: ${JSON.stringify({ 
              type: 'done',
              status: progress.status
            })}\n\n`;
            controller.enqueue(encoder.encode(doneMessage));
            
            controller.close();
          }
        } catch (error) {
          console.error('Error polling session progress:', error);
          clearInterval(pollInterval);
          removeSSEConnection(sessionId);
          controller.close();
        }
      }, 2000); // Poll every 2 seconds

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`🔌 SSE connection closed for session ${sessionId}`);
        clearInterval(pollInterval);
        removeSSEConnection(sessionId);
        controller.close();
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}