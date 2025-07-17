import { NextRequest, NextResponse } from 'next/server';
import { 
  agenticOutlineServiceV3, 
  addSSEConnection, 
  removeSSEConnection 
} from '@/lib/services/agenticOutlineServiceV3';

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

      // Get last sequence number from client for resumable connections
      const lastSequenceNumber = parseInt(searchParams.get('lastSequence') || '0');

      // Get current status and send any missed updates
      agenticOutlineServiceV3.getStreamStatus(sessionId, lastSequenceNumber)
        .then((status) => {
          if (status.hasNewContent) {
            const statusMessage = `data: ${JSON.stringify({
              type: 'status_update',
              status: status.status,
              partialContent: status.partialContent,
              sequenceNumber: status.sequenceNumber,
              connectionStatus: status.connectionStatus,
              error: status.error
            })}\n\n`;
            controller.enqueue(encoder.encode(statusMessage));
          }
        })
        .catch((error) => {
          console.error('Error getting initial status:', error);
          const errorMessage = `data: ${JSON.stringify({
            type: 'error',
            error: 'Failed to get initial status'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
        });

      // Keep connection alive with heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeatMessage = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeatMessage));
        } catch (error) {
          console.error('❌ Heartbeat failed:', error);
          clearInterval(heartbeatInterval);
          removeSSEConnection(sessionId);
          controller.close();
        }
      }, 30000); // Every 30 seconds

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`🔌 SSE connection closed for session ${sessionId}`);
        clearInterval(heartbeatInterval);
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const workflowId = resolvedParams.id;
    const { outlinePrompt } = await request.json();

    if (!outlinePrompt) {
      return NextResponse.json(
        { error: 'Missing outlinePrompt in request body' },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting streaming outline generation for workflow ${workflowId}`);

    const result = await agenticOutlineServiceV3.startOutlineGeneration(
      workflowId,
      outlinePrompt
    );

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Error starting streaming outline generation:', error);
    return NextResponse.json(
      { error: 'Failed to start outline generation', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }

    console.log(`🛑 Cancelling streaming outline generation for session ${sessionId}`);

    const result = await agenticOutlineServiceV3.cancelOutlineGeneration(sessionId);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Error cancelling outline generation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel outline generation', details: error.message },
      { status: 500 }
    );
  }
}