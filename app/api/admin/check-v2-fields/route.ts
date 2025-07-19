import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { workflowSteps } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json();

    // Get all workflow steps - use select syntax to avoid column naming issues  
    const steps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, workflowId));
    
    // Sort by stepNumber in memory
    steps.sort((a, b) => a.stepNumber - b.stepNumber);

    const fieldAnalysis = {
      semanticSeoStep: null as any,
      articleDraftStep: null as any,
      issues: [] as string[],
      recommendations: [] as string[]
    };

    // Find semantic SEO step
    const semanticStep = steps.find(s => (s.inputs as any)?.stepType === 'semantic-seo');
    if (semanticStep) {
      fieldAnalysis.semanticSeoStep = {
        stepId: semanticStep.id,
        hasV1Field: !!(semanticStep.outputs as any)?.seoOptimizedArticle,
        hasV2Field: !!(semanticStep.inputs as any)?.semanticAuditedArticleV2,
        v1FieldLength: (semanticStep.outputs as any)?.seoOptimizedArticle?.length || 0,
        v2FieldLength: (semanticStep.inputs as any)?.semanticAuditedArticleV2?.length || 0,
        outputs: Object.keys(semanticStep.outputs || {}),
        inputs: Object.keys(semanticStep.inputs || {})
      };

      // Check field issues
      if ((semanticStep.outputs as any)?.seoOptimizedArticle && !(semanticStep.inputs as any)?.semanticAuditedArticleV2) {
        fieldAnalysis.issues.push('Semantic SEO V2 is saving to V1 field (outputs.seoOptimizedArticle) instead of V2 field (inputs.semanticAuditedArticleV2)');
        fieldAnalysis.recommendations.push('Update ContentAuditStepClean to save V2 data to inputs.semanticAuditedArticleV2');
      }
    }

    // Find article draft step
    const articleStep = steps.find(s => (s.inputs as any)?.stepType === 'article-draft');
    if (articleStep) {
      fieldAnalysis.articleDraftStep = {
        stepId: articleStep.id,
        hasV1Field: !!(articleStep.outputs as any)?.fullArticle,
        hasV2Field: !!(articleStep.inputs as any)?.articleDraftV2,
        v1FieldLength: (articleStep.outputs as any)?.fullArticle?.length || 0,
        v2FieldLength: (articleStep.inputs as any)?.articleDraftV2?.length || 0,
        outputs: Object.keys(articleStep.outputs || {}),
        inputs: Object.keys(articleStep.inputs || {})
      };

      // Check field issues
      if ((articleStep.outputs as any)?.fullArticle && (articleStep.outputs as any)?.agentVersion === 'v2' && !(articleStep.inputs as any)?.articleDraftV2) {
        fieldAnalysis.issues.push('Article Draft V2 is saving to V1 field (outputs.fullArticle) instead of V2 field (inputs.articleDraftV2)');
        fieldAnalysis.recommendations.push('Update ArticleDraftStepClean to save V2 data to inputs.articleDraftV2');
      }
    }

    // General recommendations
    if (fieldAnalysis.issues.length > 0) {
      fieldAnalysis.recommendations.push('V2 data should be saved to dedicated V2 fields to prevent data loss and maintain version separation');
      fieldAnalysis.recommendations.push('Check auto-save logic to ensure it triggers after V2 completion');
    }

    return NextResponse.json({
      workflowId,
      fieldAnalysis,
      stepsAnalyzed: steps.length
    });

  } catch (error: any) {
    console.error('Check V2 fields error:', error);
    return NextResponse.json({ 
      error: 'V2 field check failed', 
      details: error.message 
    }, { status: 500 });
  }
}