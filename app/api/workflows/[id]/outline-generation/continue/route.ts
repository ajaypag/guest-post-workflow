import { NextRequest, NextResponse } from 'next/server';
import { agenticOutlineService } from '@/lib/services/agenticOutlineService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body = await request.json();
    const { sessionId, answers } = body;

    if (!sessionId || !answers) {
      return NextResponse.json(
        { error: 'Session ID and answers are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Continuing outline generation for session ${sessionId}`);

    // Continue with clarification answers
    const result = await agenticOutlineService.continueWithClarifications(
      sessionId,
      answers
    );

    console.log(`✅ Outline generation completed for session ${sessionId}`);

    // Update the workflow with the final outline
    const { db } = await import('@/lib/db/connection');
    const { workflows, outlineSessions } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    // Get the session to find workflow ID
    const session = await db.query.outlineSessions.findFirst({
      where: eq(outlineSessions.id, sessionId)
    });

    if (session) {
      // Update workflow deep-research step with the outline
      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, session.workflowId)
      });

      if (workflow && workflow.content) {
        const content = workflow.content as any;
        const updatedSteps = content.steps.map((step: any) => {
          if (step.id === 'deep-research') {
            return {
              ...step,
              outputs: {
                ...step.outputs,
                outlineContent: result.outline,
                researchStatus: 'completed',
                agenticGeneration: true,
                citations: result.citations
              },
              status: 'completed',
              completedAt: new Date()
            };
          }
          return step;
        });

        await db.update(workflows)
          .set({
            content: { ...content, steps: updatedSteps },
            updatedAt: new Date()
          })
          .where(eq(workflows.id, session.workflowId));

        console.log(`📝 Updated workflow ${session.workflowId} with outline`);
      }
    }

    return NextResponse.json({
      success: true,
      outline: result.outline,
      citations: result.citations
    });

  } catch (error: any) {
    console.error('❌ Error continuing outline generation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to continue outline generation' },
      { status: 500 }
    );
  }
}