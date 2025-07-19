import { NextRequest } from 'next/server';
import { agenticSemanticAuditV2Service } from '@/lib/services/agenticSemanticAuditV2Service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const { originalArticle, researchOutline } = await request.json();

    if (!originalArticle) {
      return Response.json({ 
        error: 'Original article is required' 
      }, { status: 400 });
    }

    // Start V2 semantic audit session
    const sessionId = await agenticSemanticAuditV2Service.startAuditSession(
      workflowId,
      originalArticle,
      researchOutline || ''
    );

    // Run audit in background (non-blocking)
    agenticSemanticAuditV2Service.performSemanticAuditV2(sessionId)
      .catch(error => {
        console.error('V2 semantic audit failed:', error);
      });

    return Response.json({
      success: true,
      sessionId,
      message: 'V2 semantic audit started'
    });

  } catch (error) {
    console.error('Error starting V2 semantic audit:', error);
    return Response.json({ 
      error: 'Failed to start V2 semantic audit',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}