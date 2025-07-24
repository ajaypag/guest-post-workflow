import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let pool: Pool | null = null;
  
  try {
    const { id: workflowId } = await params;
    console.log('Diagnosing Step 7 for workflow:', workflowId);

    // Get database connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });

    // Get workflow from database
    const workflowResult = await pool.query(
      'SELECT * FROM workflows WHERE id = $1',
      [workflowId]
    );

    if (workflowResult.rows.length === 0) {
      return NextResponse.json({
        error: 'Workflow not found',
        workflowId
      }, { status: 404 });
    }

    const workflow = workflowResult.rows[0];
    let steps = [];
    let stepsValid = true;

    // Parse steps
    try {
      steps = JSON.parse(workflow.steps);
    } catch (e) {
      console.error('Error parsing steps:', e);
      stepsValid = false;
    }

    // Find Step 6 (final-polish) and Step 7 (formatting-qa)
    const step6 = steps.find((step: any) => step.type === 'final-polish');
    const step6Index = steps.findIndex((step: any) => step.type === 'final-polish');
    const step7 = steps.find((step: any) => step.type === 'formatting-qa');
    const step7Index = steps.findIndex((step: any) => step.type === 'formatting-qa');

    // Check Step 6 details
    const step6Diagnostics = {
      exists: !!step6,
      index: step6Index,
      completed: step6?.completed || false,
      hasFinalArticle: !!(step6?.outputs?.finalArticle),
      finalArticleLength: step6?.outputs?.finalArticle?.length || 0,
      outputKeys: step6?.outputs ? Object.keys(step6.outputs) : [],
      lastModified: step6?.lastModified || null
    };

    // Check Step 7 details
    const step7Diagnostics = {
      exists: !!step7,
      index: step7Index,
      completed: step7?.completed || false,
      hasCleanedArticle: !!(step7?.outputs?.cleanedArticle),
      cleanedArticleLength: step7?.outputs?.cleanedArticle?.length || 0,
      outputKeys: step7?.outputs ? Object.keys(step7.outputs) : [],
      lastModified: step7?.lastModified || null
    };

    // Check how Step 8 would see it
    const step8Perspective = {
      canSeeStep7: !!step7,
      canAccessCleanedArticle: !!(step7?.outputs?.cleanedArticle),
      willUse: 'Unknown'
    };

    // Determine what Step 8 will use based on the fallback logic
    if (step7?.outputs?.cleanedArticle) {
      step8Perspective.willUse = 'Step 7 - Cleaned Article';
    } else {
      // Check for Step 6 (final-polish)
      const step6 = steps.find((step: any) => step.type === 'final-polish');
      if (step6?.outputs?.finalArticle) {
        step8Perspective.willUse = 'Step 6 - Final Article';
      } else {
        // Check for Step 5 (content-audit)
        const step5 = steps.find((step: any) => step.type === 'content-audit');
        if (step5?.outputs?.seoOptimizedArticle) {
          step8Perspective.willUse = 'Step 5 - SEO Optimized Article';
        } else {
          // Check for Step 4 (article-draft)
          const step4 = steps.find((step: any) => step.type === 'article-draft');
          if (step4?.outputs?.fullArticle) {
            step8Perspective.willUse = 'Step 4 - Full Article';
          } else {
            step8Perspective.willUse = 'No article found';
          }
        }
      }
    }

    // Check how Step 12 would see it (same logic)
    const step12Perspective = {
      canSeeStep7: !!step7,
      canAccessCleanedArticle: !!(step7?.outputs?.cleanedArticle),
      willUse: step8Perspective.willUse // Same fallback logic
    };

    // Generate recommendations
    const recommendations = [];
    
    if (!step7) {
      recommendations.push('Step 7 does not exist in the workflow. This is unusual - the step might have been removed.');
    } else {
      if (!step7.completed) {
        recommendations.push('Step 7 is not marked as completed. Try running the step again and ensuring it completes successfully.');
      }
      if (!step7.outputs?.cleanedArticle) {
        recommendations.push('Step 7 has no cleanedArticle output. Check if the step is saving its output correctly.');
        if (step7.outputs && Object.keys(step7.outputs).length > 0) {
          recommendations.push(`Step 7 has other outputs (${Object.keys(step7.outputs).join(', ')}) but not cleanedArticle. There may be a field name mismatch.`);
        }
      }
      if (step7.outputs?.cleanedArticle && step8Perspective.willUse !== 'Step 7 - Cleaned Article') {
        recommendations.push('Step 7 has cleanedArticle but later steps are not using it. This suggests a data access issue.');
      }
    }

    // Check for data integrity issues
    if (!stepsValid) {
      recommendations.push('The steps JSON in the database is corrupted. This needs immediate attention.');
    }

    // Return diagnostics
    return NextResponse.json({
      workflowId,
      workflow: {
        clientName: workflow.client_name,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at
      },
      step6: step6Diagnostics,
      step7: step7Diagnostics,
      step8Perspective,
      step12Perspective,
      database: {
        workflowExists: true,
        stepsValid,
        totalSteps: steps.length,
        stepsData: workflow.steps ? `${workflow.steps.substring(0, 100)}...` : 'null'
      },
      recommendations,
      debug: {
        step6Raw: step6,
        step7Raw: step7,
        allStepTypes: steps.map((s: any) => ({ 
          type: s.type, 
          completed: s.completed, 
          hasOutputs: !!s.outputs,
          outputKeys: s.outputs ? Object.keys(s.outputs) : []
        }))
      }
    });

  } catch (error) {
    console.error('Step 7 diagnostics error:', error);
    return NextResponse.json({
      error: 'Failed to run diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    // Close the pool connection
    if (pool) {
      await pool.end();
    }
  }
}