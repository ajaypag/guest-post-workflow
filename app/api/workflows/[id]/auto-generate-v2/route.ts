import { NextRequest, NextResponse } from 'next/server';
import { agenticArticleV2Service } from '@/lib/services/agenticArticleV2Service';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const { outline, mockMode = false } = await request.json();
    
    if (!outline) {
      return NextResponse.json({ 
        success: false, 
        error: 'Outline is required' 
      }, { status: 400 });
    }
    
    // Verify workflow exists
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    });
    
    if (!workflow) {
      return NextResponse.json({ 
        success: false, 
        error: 'Workflow not found' 
      }, { status: 404 });
    }
    
    console.log(`🚀 Starting V2 article generation for workflow ${workflowId}${mockMode ? ' (MOCK MODE)' : ''}`);
    
    // Start the V2 generation session
    const sessionId = await agenticArticleV2Service.startSession(workflowId, outline, mockMode);
    
    // Start generation in background (non-blocking)
    if (mockMode) {
      // Use mock service for testing
      const { agenticArticleV2MockService } = await import('@/lib/services/agenticArticleV2MockService');
      agenticArticleV2MockService.performMockGeneration(sessionId, workflowId, outline).catch(error => {
        console.error('Background mock generation failed:', error);
      });
    } else {
      // Use real service
      agenticArticleV2Service.performArticleGeneration(sessionId).catch(error => {
        console.error('Background generation failed:', error);
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      sessionId,
      message: 'V2 article generation started'
    });
    
  } catch (error: any) {
    console.error('Failed to start V2 generation:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to start V2 article generation' 
    }, { status: 500 });
  }
}