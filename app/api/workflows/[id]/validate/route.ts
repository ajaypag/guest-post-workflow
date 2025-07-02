import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/db/workflowService';
import { WORKFLOW_STEPS } from '@/types/workflow';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the workflow from database
    const workflow = await WorkflowService.getGuestPostWorkflow(id);
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Validate workflow structure
    const issues = [];
    const report = {
      workflowId: workflow.id,
      totalSteps: workflow.steps?.length || 0,
      expectedSteps: WORKFLOW_STEPS.length,
      currentStep: workflow.currentStep,
      issues: [] as string[],
      stepDetails: [] as any[],
      metadata: workflow.metadata || {}
    };

    // Check if we have the right number of steps
    if (!workflow.steps || workflow.steps.length !== WORKFLOW_STEPS.length) {
      report.issues.push(`Step count mismatch: expected ${WORKFLOW_STEPS.length}, got ${workflow.steps?.length || 0}`);
    }

    // Validate each step
    if (workflow.steps) {
      workflow.steps.forEach((step, index) => {
        const expectedStep = WORKFLOW_STEPS[index];
        const stepIssues = [];

        if (!step.id) stepIssues.push('Missing step ID');
        if (!step.title) stepIssues.push('Missing step title');
        if (step.id !== expectedStep?.id) stepIssues.push(`ID mismatch: expected ${expectedStep?.id}, got ${step.id}`);
        if (!step.inputs) stepIssues.push('Missing inputs object');
        if (!step.outputs) stepIssues.push('Missing outputs object');
        if (!['pending', 'in-progress', 'completed'].includes(step.status)) {
          stepIssues.push(`Invalid status: ${step.status}`);
        }

        report.stepDetails.push({
          index,
          stepId: step.id,
          title: step.title,
          status: step.status,
          hasInputs: !!step.inputs && Object.keys(step.inputs).length > 0,
          inputKeys: step.inputs ? Object.keys(step.inputs) : [],
          hasOutputs: !!step.outputs && Object.keys(step.outputs).length > 0,
          outputKeys: step.outputs ? Object.keys(step.outputs) : [],
          issues: stepIssues
        });

        if (stepIssues.length > 0) {
          report.issues.push(`Step ${index} (${step.id}): ${stepIssues.join(', ')}`);
        }
      });
    }

    // Check metadata
    const metadataKeys = Object.keys(workflow.metadata || {});
    report.stepDetails.push({
      section: 'metadata',
      keys: metadataKeys,
      hasClientId: !!workflow.metadata?.clientId,
      hasPitchKeyword: !!workflow.metadata?.pitchKeyword,
      hasPitchTopic: !!workflow.metadata?.pitchTopic
    });

    // Overall health assessment
    const healthScore = Math.max(0, 100 - (report.issues.length * 10));
    const status = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';

    return NextResponse.json({
      status,
      healthScore,
      report,
      recommendations: generateRecommendations(report)
    });

  } catch (error) {
    console.error('Error validating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to validate workflow' },
      { status: 500 }
    );
  }
}

function generateRecommendations(report: any): string[] {
  const recommendations = [];

  if (report.totalSteps !== report.expectedSteps) {
    recommendations.push(`Initialize missing workflow steps (need ${report.expectedSteps - report.totalSteps} more steps)`);
  }

  if (report.currentStep >= report.totalSteps) {
    recommendations.push('Current step index is beyond available steps - reset to valid range');
  }

  const stepsWithoutData = report.stepDetails.filter((step: any) => 
    step.index !== undefined && !step.hasInputs && !step.hasOutputs
  );
  
  if (stepsWithoutData.length > 0) {
    recommendations.push(`${stepsWithoutData.length} steps have no input/output data - may need initialization`);
  }

  const completedStepsWithoutData = report.stepDetails.filter((step: any) => 
    step.status === 'completed' && (!step.hasOutputs || step.outputKeys.length === 0)
  );

  if (completedStepsWithoutData.length > 0) {
    recommendations.push(`${completedStepsWithoutData.length} completed steps missing output data - data may have been lost`);
  }

  if (report.issues.length === 0) {
    recommendations.push('Workflow structure looks healthy - all validations passed');
  }

  return recommendations;
}