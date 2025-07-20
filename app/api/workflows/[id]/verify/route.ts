import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Direct database query to bypass any caching
    const result = await db
      .select({
        content: workflows.content,
        updatedAt: workflows.updatedAt
      })
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const workflow = result[0];
    const workflowContent = workflow.content as any;
    
    // Find the article draft step
    const articleDraftStep = workflowContent.steps?.find(
      (step: any) => step.id === 'article-draft'
    );

    // Generate a content hash for verification
    const contentStr = JSON.stringify(articleDraftStep?.outputs || {});
    let hash = 0;
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const contentHash = hash.toString(36);

    return NextResponse.json({
      step: articleDraftStep,
      contentHash,
      updatedAt: workflow.updatedAt,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error verifying workflow:', error);
    return NextResponse.json(
      { error: 'Failed to verify workflow content' },
      { status: 500 }
    );
  }
}