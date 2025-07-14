import { NextRequest, NextResponse } from 'next/server';
import { agenticSemanticAuditService, addAuditSSEConnection, removeAuditSSEConnection } from '@/lib/services/agenticSemanticAuditService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Setting up SSE stream for audit session: ${sessionId}`);

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Set up SSE headers
        const encoder = new TextEncoder();
        
        // Send initial connection message
        const initialMessage = `data: ${JSON.stringify({ 
          type: 'connected', 
          sessionId,
          message: 'Connected to semantic audit stream' 
        })}\n\n`;
        controller.enqueue(encoder.encode(initialMessage));

        // Create a response writer object that matches the expected interface
        const responseWriter = {
          write: (data: string) => {
            try {
              controller.enqueue(encoder.encode(data));
            } catch (error) {
              console.error('Error writing to audit stream:', error);
            }
          }
        };

        // Register this connection
        addAuditSSEConnection(sessionId, responseWriter);

        // Set up periodic progress updates
        const progressInterval = setInterval(async () => {
          try {
            const progress = await agenticSemanticAuditService.getAuditProgress(sessionId);
            if (progress) {
              const progressMessage = `data: ${JSON.stringify({ 
                type: 'progress', 
                ...progress 
              })}\n\n`;
              controller.enqueue(encoder.encode(progressMessage));
            }
          } catch (error) {
            console.error('Error sending audit progress update:', error);
          }
        }, 2000); // Update every 2 seconds

        // Clean up on stream close
        request.signal?.addEventListener('abort', () => {
          console.log(`🔍 Audit SSE stream closed for session: ${sessionId}`);
          clearInterval(progressInterval);
          removeAuditSSEConnection(sessionId);
          try {
            controller.close();
          } catch (error) {
            console.error('Error closing audit stream:', error);
          }
        });
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error: any) {
    console.error('🔴 Error setting up audit SSE stream:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to set up audit stream',
        details: error.message 
      },
      { status: 500 }
    );
  }
}