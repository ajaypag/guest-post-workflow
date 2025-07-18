import { NextRequest } from 'next/server';
import { agenticArticleV2Service, addSSEConnection, removeSSEConnection } from '@/lib/services/agenticArticleV2Service';

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

  // Create a TransformStream for SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Store the writer for the service to send updates
  const streamConnection = {
    write: (data: string) => {
      writer.write(encoder.encode(data));
    }
  };

  // Register this connection
  addSSEConnection(sessionId, streamConnection);

  // Send initial connection message
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`));

  // Poll for progress updates
  const pollInterval = setInterval(async () => {
    try {
      const progress = await agenticArticleV2Service.getSessionProgress(sessionId);
      
      if (!progress) {
        writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Session not found' })}\n\n`));
        clearInterval(pollInterval);
        removeSSEConnection(sessionId);
        writer.close();
        return;
      }

      // Send progress update
      writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'progress',
        session: progress.session,
        progress: progress.progress
      })}\n\n`));

      // Close stream when complete or failed
      if (progress.session.status === 'completed' || progress.session.status === 'failed') {
        writer.write(encoder.encode(`data: ${JSON.stringify({ 
          type: 'complete', 
          status: progress.session.status,
          finalArticle: progress.session.finalArticle,
          errorMessage: progress.session.errorMessage 
        })}\n\n`));
        clearInterval(pollInterval);
        removeSSEConnection(sessionId);
        writer.close();
      }

    } catch (error) {
      console.error('Error polling V2 progress:', error);
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Failed to get progress' })}\n\n`));
      clearInterval(pollInterval);
      removeSSEConnection(sessionId);
      writer.close();
    }
  }, 2000);

  // Clean up on client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(pollInterval);
    removeSSEConnection(sessionId);
    writer.close();
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}