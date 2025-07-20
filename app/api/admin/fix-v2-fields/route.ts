import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workflowSteps } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { workflowId, fixType } = await request.json();
    
    const fixes = {
      semanticFixed: false,
      articleFixed: false,
      errors: [] as string[]
    };

    if (fixType === 'semantic' || fixType === 'all') {
      // Fix semantic SEO V2 field
      const semanticStep = await db.query.workflowSteps.findFirst({
        where: and(
          eq(workflowSteps.workflowId, workflowId),
          eq(workflowSteps.inputs.stepType, 'semantic-seo')
        )
      });

      if (semanticStep && semanticStep.outputs?.seoOptimizedArticle && semanticStep.outputs?.auditVersion === 'v2') {
        try {
          // Move V2 data from outputs to inputs
          const updatedInputs = {
            ...semanticStep.inputs,
            semanticAuditedArticleV2: semanticStep.outputs.seoOptimizedArticle
          };

          await db.update(workflowSteps)
            .set({
              inputs: updatedInputs,
              updatedAt: new Date()
            })
            .where(eq(workflowSteps.id, semanticStep.id));

          fixes.semanticFixed = true;
        } catch (error: any) {
          fixes.errors.push(`Semantic fix failed: ${error.message}`);
        }
      }
    }

    if (fixType === 'article' || fixType === 'all') {
      // Fix article draft V2 field
      const articleStep = await db.query.workflowSteps.findFirst({
        where: and(
          eq(workflowSteps.workflowId, workflowId),
          eq(workflowSteps.inputs.stepType, 'article-draft')
        )
      });

      if (articleStep && articleStep.outputs?.fullArticle && articleStep.outputs?.agentVersion === 'v2') {
        try {
          // Move V2 data from outputs to inputs
          const updatedInputs = {
            ...articleStep.inputs,
            articleDraftV2: articleStep.outputs.fullArticle
          };

          await db.update(workflowSteps)
            .set({
              inputs: updatedInputs,
              updatedAt: new Date()
            })
            .where(eq(workflowSteps.id, articleStep.id));

          fixes.articleFixed = true;
        } catch (error: any) {
          fixes.errors.push(`Article fix failed: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: fixes.errors.length === 0,
      fixes,
      message: fixes.errors.length > 0 
        ? `Partial fix completed with errors: ${fixes.errors.join(', ')}` 
        : 'V2 fields fixed successfully'
    });

  } catch (error: any) {
    console.error('Fix V2 fields error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'V2 field fix failed', 
      details: error.message 
    }, { status: 500 });
  }
}