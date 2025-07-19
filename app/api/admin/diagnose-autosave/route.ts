import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workflows, workflowSteps, v2AgentSessions } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json();

    // 1. Get workflow and its steps
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // 2. Get workflow steps
    const steps = await db.query.workflowSteps.findMany({
      where: eq(workflowSteps.workflowId, workflowId),
      orderBy: workflowSteps.stepNumber
    });

    // 3. Get V2 sessions
    const v2Sessions = await db.query.v2AgentSessions.findMany({
      where: eq(v2AgentSessions.workflowId, workflowId),
      orderBy: desc(v2AgentSessions.createdAt)
    });

    // 4. Analyze issues
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for V2 data in steps
    const semanticStep = steps.find(s => s.inputs?.stepType === 'semantic-seo');
    const articleStep = steps.find(s => s.inputs?.stepType === 'article-draft');

    if (semanticStep) {
      if (!semanticStep.inputs?.semanticAuditedArticleV2) {
        issues.push('Semantic SEO V2: No V2 data found in workflow step despite V2 session completion');
      }
      if (semanticStep.inputs?.semanticAuditedArticle && !semanticStep.inputs?.semanticAuditedArticleV2) {
        issues.push('Semantic SEO: Has V1 data but missing V2 data');
      }
    }

    if (articleStep) {
      if (!articleStep.inputs?.articleDraftV2 && v2Sessions.some(s => s.stepId === 'article-draft-v2' && s.status === 'completed')) {
        issues.push('Article Draft V2: Completed session exists but no data in workflow step');
      }
    }

    // Check V2 sessions vs step data mismatch
    for (const session of v2Sessions) {
      if (session.status === 'completed' && session.finalArticle) {
        const stepType = session.stepId.replace('-v2', '');
        const step = steps.find(s => s.inputs?.stepType === stepType);
        
        if (!step) {
          issues.push(`Missing workflow step for completed V2 session: ${session.stepId}`);
        } else {
          const v2Field = session.stepId === 'semantic-audit-v2' ? 'semanticAuditedArticleV2' : 'articleDraftV2';
          if (!step.inputs?.[v2Field]) {
            issues.push(`V2 session ${session.id} completed but data not saved to step ${stepType}`);
          }
        }
      }
    }

    // Check for timing issues
    if (workflow.content?.steps) {
      const contentSteps = workflow.content.steps;
      for (const step of steps) {
        const contentStep = contentSteps.find((cs: any) => cs.id === step.id);
        if (contentStep && JSON.stringify(contentStep) !== JSON.stringify(step)) {
          issues.push(`Step ${step.stepNumber} data mismatch between workflow.content and workflow_steps table`);
        }
      }
    }

    // Recommendations
    if (issues.some(i => i.includes('V2 session') && i.includes('completed'))) {
      recommendations.push('V2 sessions are completing but data is not being saved to workflow steps');
      recommendations.push('Check if onComplete callback in V2 components is properly updating the form data');
      recommendations.push('Verify that auto-save is triggered after V2 completion');
    }

    if (issues.some(i => i.includes('data mismatch'))) {
      recommendations.push('Data inconsistency detected - workflow may be using cached data');
      recommendations.push('Ensure StepForm is reading from workflow_steps table, not workflow.content');
    }

    // Build response
    const response = {
      workflowSteps: steps.map(s => ({
        id: s.id,
        stepNumber: s.stepNumber,
        title: s.title,
        status: s.status,
        inputs: s.inputs,
        outputs: s.outputs,
        updatedAt: s.updatedAt
      })),
      v2Sessions: v2Sessions.map(s => ({
        id: s.id,
        stepId: s.stepId,
        status: s.status,
        finalArticle: s.finalArticle ? s.finalArticle.substring(0, 100) + '...' : null,
        errorMessage: s.errorMessage,
        createdAt: s.createdAt,
        completedAt: s.completedAt
      })),
      recentAutoSaves: [], // Would need to implement logging for this
      stepData: {},
      issues,
      recommendations
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Diagnose auto-save error:', error);
    return NextResponse.json({ 
      error: 'Diagnostic failed', 
      details: error.message 
    }, { status: 500 });
  }
}