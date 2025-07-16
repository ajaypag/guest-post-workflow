import { NextRequest, NextResponse } from 'next/server';
import { agenticFinalPolishService } from '@/lib/services/agenticFinalPolishService';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;

    // Get workflow data to extract the article and research context
    const workflow = await db.select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow[0]) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflowData = workflow[0].content as any;
    const steps = workflowData.steps || [];

    // Get the SEO-optimized article from Step 5 (content-audit), fallback to original draft
    const contentAuditStep = steps.find((s: any) => s.id === 'content-audit');
    const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
    
    // Fallback to original draft if SEO version not available
    const articleDraftStep = steps.find((s: any) => s.id === 'article-draft');
    const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
    
    const articleToPolish = seoOptimizedArticle || originalArticle;

    if (!articleToPolish || articleToPolish.trim().length === 0) {
      return NextResponse.json(
        { error: 'No article found to polish. Please complete the article draft or semantic SEO audit steps first.' },
        { status: 400 }
      );
    }

    // Get research context for additional context
    const deepResearchStep = steps.find((s: any) => s.id === 'deep-research');
    const researchContext = deepResearchStep?.outputs?.researchSummary || '';

    console.log(`🎨 Starting final polish for workflow ${workflowId}`);
    console.log(`📄 Article length: ${articleToPolish.length} characters`);
    console.log(`🔍 Research context: ${researchContext ? 'Available' : 'Not available'}`);

    // Start the polish session
    const sessionId = await agenticFinalPolishService.startPolishSession(
      workflowId,
      articleToPolish,
      researchContext
    );

    // Start the polish process asynchronously
    agenticFinalPolishService.performFinalPolish(sessionId).catch(error => {
      console.error('Final polish process failed:', error);
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Final polish session started successfully'
    });

  } catch (error: any) {
    console.error('🔴 Error starting final polish session:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to start final polish session',
        details: error.message 
      },
      { status: 500 }
    );
  }
}