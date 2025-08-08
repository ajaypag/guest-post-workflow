import { NextRequest } from 'next/server';
import { 
  addSEOAuditSSEConnection, 
  removeSEOAuditSSEConnection,
  agenticSEOAuditorService 
} from '@/lib/services/agenticSEOAuditorService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Add SSE connection
      const connection = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('SEO audit SSE write error:', error);
          }
        }
      };
      
      addSEOAuditSSEConnection(sessionId, connection);
      
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected","message":"Connected to SEO audit stream"}\n\n'));
      
      // Poll for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const progress = await agenticSEOAuditorService.getAuditProgress(sessionId);
          
          if (progress) {
            const progressData = JSON.stringify({
              type: 'progress',
              session: progress.session,
              progress: progress.progress
            });
            
            controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
            
            // Check if completed or failed
            if (progress.session.status === 'completed' || progress.session.status === 'failed') {
              clearInterval(pollInterval);
              
              // Send completion event
              const completeData = JSON.stringify({
                type: 'complete',
                status: progress.session.status,
                websiteUrl: progress.session.websiteUrl,
                errorMessage: progress.session.errorMessage
              });
              
              controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
              
              // Clean up
              removeSEOAuditSSEConnection(sessionId);
              controller.close();
            }
          }
        } catch (error) {
          console.error('SEO audit progress polling error:', error);
          clearInterval(pollInterval);
          
          // Send error event
          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
          
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          removeSEOAuditSSEConnection(sessionId);
          controller.close();
        }
      }, 1000); // Poll every second
      
      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        removeSEOAuditSSEConnection(sessionId);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    }
  });
}