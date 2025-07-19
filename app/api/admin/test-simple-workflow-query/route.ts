import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json();
    
    // Use raw SQL to completely bypass Drizzle's column mapping
    const stepsResult = await db.execute(sql`
      SELECT 
        id,
        workflow_id,
        title,
        status,
        inputs,
        outputs,
        created_at,
        updated_at
      FROM workflow_steps
      WHERE workflow_id = ${workflowId}
      ORDER BY id
    `);
    
    // Check for V2 data in the inputs
    const steps = stepsResult.rows.map((row: any) => {
      const inputs = row.inputs || {};
      const outputs = row.outputs || {};
      
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        stepType: inputs.stepType || 'unknown',
        hasSemanticV2: !!inputs.semanticAuditedArticleV2,
        hasArticleV2: !!inputs.articleDraftV2,
        semanticV2Length: inputs.semanticAuditedArticleV2?.length || 0,
        articleV2Length: inputs.articleDraftV2?.length || 0,
        // Check if V2 data is in wrong place
        hasV1SemanticData: !!outputs.seoOptimizedArticle,
        hasV1ArticleData: !!outputs.fullArticle,
        auditVersion: outputs.auditVersion,
        agentVersion: outputs.agentVersion
      };
    });
    
    // Analysis
    const analysis = {
      totalSteps: steps.length,
      semanticStep: steps.find(s => s.stepType === 'semantic-seo'),
      articleStep: steps.find(s => s.stepType === 'article-draft'),
      issues: [] as string[],
      recommendations: [] as string[]
    };
    
    // Check for issues
    const semanticStep = analysis.semanticStep;
    if (semanticStep) {
      if (!semanticStep.hasSemanticV2 && semanticStep.hasV1SemanticData && semanticStep.auditVersion === 'v2') {
        analysis.issues.push('Semantic V2 data is in wrong field (outputs.seoOptimizedArticle instead of inputs.semanticAuditedArticleV2)');
        analysis.recommendations.push('Run the Fix V2 Fields button to move data to correct location');
      }
    }
    
    const articleStep = analysis.articleStep;
    if (articleStep) {
      if (!articleStep.hasArticleV2 && articleStep.hasV1ArticleData && articleStep.agentVersion === 'v2') {
        analysis.issues.push('Article V2 data is in wrong field (outputs.fullArticle instead of inputs.articleDraftV2)');
        analysis.recommendations.push('Run the Fix V2 Fields button to move data to correct location');
      }
    }
    
    return NextResponse.json({
      success: true,
      workflowId,
      steps,
      analysis
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message,
      hint: 'This uses raw SQL to bypass column mapping issues'
    }, { status: 500 });
  }
}