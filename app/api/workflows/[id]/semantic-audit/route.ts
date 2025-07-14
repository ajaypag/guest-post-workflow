import { NextRequest, NextResponse } from 'next/server';
import { agenticSemanticAuditService } from '@/lib/services/agenticSemanticAuditService';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const { originalArticle, researchOutline } = await request.json();

    if (!originalArticle) {
      return NextResponse.json(
        { error: 'Original article is required from Article Draft step' },
        { status: 400 }
      );
    }

    if (!researchOutline) {
      return NextResponse.json(
        { error: 'Research outline is required from Deep Research step' },
        { status: 400 }
      );
    }

    console.log('🔍 Starting semantic SEO audit for workflow:', workflowId);

    // Start the audit session
    const sessionId = await agenticSemanticAuditService.startAuditSession(
      workflowId, 
      originalArticle, 
      researchOutline
    );

    // Start semantic audit in background (non-blocking)
    agenticSemanticAuditService.performSemanticAudit(sessionId).catch(error => {
      console.error('Background semantic audit failed:', error);
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Semantic SEO audit started. Use /progress endpoint to track status.'
    });

  } catch (error: any) {
    console.error('🔴 Error starting semantic audit:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to start semantic audit',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

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

    // Get audit progress data
    const progress = await agenticSemanticAuditService.getAuditProgress(sessionId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Audit session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...progress
    });

  } catch (error: any) {
    console.error('🔴 Error getting audit progress:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get audit progress',
        details: error.message 
      },
      { status: 500 }
    );
  }
}