import { NextRequest, NextResponse } from 'next/server';
import { agenticFinalPolishV2Service, addSSEConnection, removeSSEConnection } from '@/lib/services/agenticFinalPolishV2Service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Helper to send SSE messages
      const sendMessage = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Register this connection
      const res = {
        write: (chunk: string) => {
          controller.enqueue(encoder.encode(chunk));
        }
      };
      
      addSSEConnection(sessionId, res);

      // Send initial connection message
      sendMessage({ type: 'connected', sessionId });

      // Check session status periodically
      const statusInterval = setInterval(async () => {
        try {
          const progress = await agenticFinalPolishV2Service.getSessionProgress(sessionId);
          
          if (progress?.session?.status === 'completed') {
            clearInterval(statusInterval);
            removeSSEConnection(sessionId);
            controller.close();
          } else if (progress?.session?.status === 'failed') {
            clearInterval(statusInterval);
            removeSSEConnection(sessionId);
            sendMessage({ 
              type: 'error', 
              error: progress.session.errorMessage || 'Polish process failed' 
            });
            controller.close();
          }
        } catch (error) {
          console.error('Error checking session status:', error);
        }
      }, 2000);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(statusInterval);
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