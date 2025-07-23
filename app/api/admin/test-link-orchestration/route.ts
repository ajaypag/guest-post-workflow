import { NextRequest, NextResponse } from 'next/server';
import { linkOrchestrationService } from '@/lib/services/linkOrchestrationService';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  console.log('[Test Link Orchestration] Starting test orchestration');
  
  try {
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

    // Create a temporary workflow ID for testing - must be a valid UUID
    const testWorkflowId = uuidv4();
    
    console.log('[Test Link Orchestration] Test parameters:', {
      testWorkflowId,
      hasArticle: !!article,
      articleLength: article?.length,
      targetDomain,
      clientName,
      clientUrl,
      anchorText,
      guestPostSite,
      targetKeyword,
      useStreaming
    });

    // If streaming is requested, use SSE
    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      // Start orchestration in background
      (async () => {
        try {
          console.log('[Test Link Orchestration] Starting orchestration service');
          
          const result = await linkOrchestrationService.orchestrate({
            workflowId: testWorkflowId,
            article,
            targetDomain,
            clientName,
            clientUrl,
            anchorText,
            guestPostSite,
            targetKeyword,
            onProgress: (phase, message) => {
              console.log(`[Test Link Orchestration] Progress - Phase ${phase}: ${message}`);
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

          console.log('[Test Link Orchestration] Completed successfully:', result.sessionId);
          // Send final result
          const finalEvent = JSON.stringify({
            type: 'complete',
            result,
            timestamp: new Date().toISOString()
          });
          writer.write(encoder.encode(`data: ${finalEvent}\n\n`));
        } catch (error: any) {
          console.error('[Test Link Orchestration] Error occurred:', error);
          console.error('[Test Link Orchestration] Error stack:', error.stack);
          console.error('[Test Link Orchestration] Error details:', JSON.stringify(error, null, 2));
          
          // Send error event
          const errorEvent = JSON.stringify({
            type: 'error',
            error: error.message || 'Unknown error occurred',
            details: error.stack,
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
      console.log('[Test Link Orchestration] Running non-streaming test');
      
      const result = await linkOrchestrationService.orchestrate({
        workflowId: testWorkflowId,
        article,
        targetDomain,
        clientName,
        clientUrl,
        anchorText,
        guestPostSite,
        targetKeyword,
        onProgress: (phase, message) => {
          console.log(`[Test Link Orchestration] Progress - Phase ${phase}: ${message}`);
        }
      });

      console.log('[Test Link Orchestration] Non-streaming result:', result);
      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error('[Test Link Orchestration] Route error:', error);
    console.error('[Test Link Orchestration] Route error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}