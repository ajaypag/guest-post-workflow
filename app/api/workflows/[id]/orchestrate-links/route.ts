import { NextRequest, NextResponse } from 'next/server';
import { linkOrchestrationService } from '@/lib/services/linkOrchestrationService';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Note: Authentication can be added here if needed
    // For now, proceeding without auth check to match other workflow endpoints

    // Get the workflow to verify access
    const [workflow] = await db.select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const {
      article,
      targetDomain,
      clientName,
      clientUrl,
      anchorText,
      guestPostSite,
      targetKeyword,
      useStreaming = true
    } = body;

    // Validate required fields
    if (!article || !targetDomain || !clientName || !clientUrl || !guestPostSite || !targetKeyword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If streaming is requested, use SSE
    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      // Start orchestration in background
      (async () => {
        try {
          const result = await linkOrchestrationService.orchestrate({
            workflowId: id,
            article,
            targetDomain,
            clientName,
            clientUrl,
            anchorText,
            guestPostSite,
            targetKeyword,
            onProgress: (phase, message) => {
              // Send progress updates via SSE
              const event = JSON.stringify({
                type: 'progress',
                phase,
                message,
                timestamp: new Date().toISOString()
              });
              writer.write(encoder.encode(`data: ${event}\n\n`));
            }
          });

          // Send final result
          const finalEvent = JSON.stringify({
            type: 'complete',
            result,
            timestamp: new Date().toISOString()
          });
          writer.write(encoder.encode(`data: ${finalEvent}\n\n`));
        } catch (error: any) {
          // Send error event
          const errorEvent = JSON.stringify({
            type: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
          });
          writer.write(encoder.encode(`data: ${errorEvent}\n\n`));
        } finally {
          writer.close();
        }
      })();

      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const result = await linkOrchestrationService.orchestrate({
        workflowId: id,
        article,
        targetDomain,
        clientName,
        clientUrl,
        anchorText,
        guestPostSite,
        targetKeyword
      });

      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error('Link orchestration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Resume a failed session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Note: Authentication can be added here if needed
    // For now, proceeding without auth check to match other workflow endpoints

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const result = await linkOrchestrationService.resumeSession(sessionId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Resume session error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}