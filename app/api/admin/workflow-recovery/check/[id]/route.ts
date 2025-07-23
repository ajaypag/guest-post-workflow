import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/connection';
import { WORKFLOW_STEPS } from '@/types/workflow';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM workflows WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }
    
    const workflow = result.rows[0];
    const content = workflow.content;
    const steps = content?.steps || [];
    
    // Analyze the workflow structure
    const hasOrchestrationStep = steps.some((step: any) => step.id === 'link-orchestration');
    const currentStepIds = steps.map((s: any) => s.id);
    const missingStepIds = WORKFLOW_STEPS.map(s => s.id).filter(id => !currentStepIds.includes(id));
    
    // Check for data in each step
    const stepAnalysis = steps.map((step: any, index: number) => {
      const hasData = step.outputs && Object.keys(step.outputs).length > 0;
      const dataFields = hasData ? Object.keys(step.outputs) : [];
      
      // Check if this is the orchestration step that might contain legacy data
      let preservedData = null;
      if (step.id === 'link-orchestration' && step.outputs) {
        preservedData = {
          internalLinksLegacy: step.outputs.internalLinksLegacy,
          clientMentionLegacy: step.outputs.clientMentionLegacy,
          clientLinkLegacy: step.outputs.clientLinkLegacy,
          imagesLegacy: step.outputs.imagesLegacy,
          linkRequestsLegacy: step.outputs.linkRequestsLegacy,
          urlSuggestionLegacy: step.outputs.urlSuggestionLegacy,
          orchestrationSession: step.outputs.sessionId,
          finalContent: step.outputs.finalContent
        };
      }
      
      return {
        index,
        id: step.id,
        title: step.title,
        status: step.status,
        hasData,
        dataFields,
        preservedData
      };
    });
    
    // Check for recovery options
    const recoveryOptions = [];
    let dataLost = false;
    let recoveryPossible = false;
    
    if (hasOrchestrationStep && missingStepIds.length > 0) {
      dataLost = true;
      recoveryOptions.push('Restore original step structure (steps 8-14)');
      
      // Check if orchestration step has legacy data
      const orchStep = steps.find((s: any) => s.id === 'link-orchestration');
      if (orchStep?.outputs) {
        const legacyFields = Object.keys(orchStep.outputs).filter(k => k.includes('Legacy'));
        if (legacyFields.length > 0) {
          recoveryOptions.push(`Recover data from ${legacyFields.length} legacy fields`);
          recoveryPossible = true;
        }
      }
      
      // Check if we can recover from orchestration session
      if (orchStep?.outputs?.sessionId) {
        recoveryOptions.push('Attempt to recover from orchestration session data');
        recoveryPossible = true;
      }
      
      // Always possible to restore structure
      recoveryPossible = true;
    }
    
    return NextResponse.json({
      workflowId: id,
      title: workflow.title,
      steps: stepAnalysis,
      hasOrchestrationStep,
      missingSteps: missingStepIds,
      dataLost,
      recoveryPossible,
      recoveryOptions,
      metadata: {
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        totalSteps: steps.length,
        expectedSteps: WORKFLOW_STEPS.length
      }
    });
    
  } catch (error) {
    console.error('Error checking workflow:', error);
    return NextResponse.json(
      { error: 'Failed to check workflow' },
      { status: 500 }
    );
  }
}