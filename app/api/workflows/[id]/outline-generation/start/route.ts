import { NextRequest, NextResponse } from 'next/server';
import { agenticOutlineService } from '@/lib/services/agenticOutlineServiceUnified';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    console.log(`📝 Starting outline generation for workflow ${workflowId}`);

    // Get workflow to extract the outline prompt
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get the outline prompt from topic generation step
    const content = workflow.content as any;
    const topicGenerationStep = content?.steps?.find(
      (s: any) => s.id === 'topic-generation'
    );
    
    const outlinePrompt = topicGenerationStep?.outputs?.outlinePrompt;

    if (!outlinePrompt) {
      return NextResponse.json(
        { error: 'No outline prompt found. Please complete the Topic Generation step first.' },
        { status: 400 }
      );
    }

    console.log(`🚀 Found outline prompt, starting generation...`);

    // Start the outline generation
    const result = await agenticOutlineService.startOutlineGeneration(
      workflowId,
      outlinePrompt
    );

    console.log(`✅ Outline generation started:`, {
      sessionId: result.sessionId,
      status: result.status,
      implementation: result.implementation
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('❌ Error starting outline generation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start outline generation' },
      { status: 500 }
    );
  }
}