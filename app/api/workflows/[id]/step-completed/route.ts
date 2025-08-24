/**
 * Universal Step Completion Webhook
 * 
 * Handles step completion events for any workflow template.
 * Triggers flexible progress calculation and order completion checks.
 * 
 * This endpoint is called whenever any workflow step status changes to 'completed'.
 * It works with 5-step, 16-step, 50-step, or any custom workflow templates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { WorkflowService } from '@/lib/db/workflowService';
import { WorkflowProgressService } from '@/lib/services/workflowProgressService';

// Step completion payload interface
interface StepCompletedPayload {
  workflowId: string;
  stepId: string;
  newStatus: 'pending' | 'in-progress' | 'completed';
  stepData?: Record<string, any>;
  completedAt?: string; // ISO date string
  outputs?: Record<string, any>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Step completion webhook - Starting');
    
    // Authentication check - only internal users can trigger step completions
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can update workflow steps' }, { status: 403 });
    }

    const { id: workflowId } = await params;
    const payload: StepCompletedPayload = await request.json();

    console.log(`Step completion webhook - Workflow: ${workflowId}, Step: ${payload.stepId}, Status: ${payload.newStatus}`);

    // Validate payload
    if (!payload.stepId || !payload.newStatus) {
      return NextResponse.json({ 
        error: 'Missing required fields: stepId and newStatus are required' 
      }, { status: 400 });
    }

    // Get current workflow to ensure it exists
    const workflow = await WorkflowService.getGuestPostWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    console.log(`Found workflow: ${workflow.clientName} - ${workflow.targetDomain}`);

    // Find the step to update
    const stepIndex = workflow.steps.findIndex(step => step.id === payload.stepId);
    if (stepIndex === -1) {
      return NextResponse.json({ 
        error: `Step not found: ${payload.stepId}` 
      }, { status: 404 });
    }

    console.log(`Found step at index ${stepIndex}: ${workflow.steps[stepIndex].title}`);

    // Update the step status and data
    const updatedStep = {
      ...workflow.steps[stepIndex],
      status: payload.newStatus as 'pending' | 'in-progress' | 'completed',
      completedAt: payload.newStatus === 'completed' ? 
        (payload.completedAt ? new Date(payload.completedAt) : new Date()) : 
        undefined,
      outputs: {
        ...workflow.steps[stepIndex].outputs,
        ...(payload.outputs || {})
      }
    };

    // If step data provided, merge it into outputs
    if (payload.stepData) {
      updatedStep.outputs = {
        ...updatedStep.outputs,
        ...payload.stepData
      };
    }

    // Update the workflow with the modified step
    const updatedSteps = [...workflow.steps];
    updatedSteps[stepIndex] = updatedStep;

    // Update current step if this step was completed and we're moving forward
    let newCurrentStep = workflow.currentStep || 0;
    if (payload.newStatus === 'completed' && stepIndex >= newCurrentStep) {
      // Move to next incomplete step, or stay at last step if all complete
      const nextIncompleteStep = updatedSteps.findIndex((step, idx) => 
        idx > stepIndex && step.status !== 'completed'
      );
      newCurrentStep = nextIncompleteStep !== -1 ? nextIncompleteStep : updatedSteps.length - 1;
    }

    const updatedWorkflow = {
      ...workflow,
      steps: updatedSteps,
      currentStep: newCurrentStep,
      updatedAt: new Date()
    };

    console.log(`Updating workflow in database with new step status`);

    // Save updated workflow to database
    const saveResult = await WorkflowService.updateWorkflow(workflowId, {
      content: updatedWorkflow,
      updatedAt: new Date()
    });

    if (!saveResult) {
      throw new Error('Failed to save workflow updates to database');
    }

    console.log(`Workflow updated successfully - triggering progress calculation`);

    // Trigger progress calculation and order completion check
    const progressResult = await WorkflowProgressService.updateWorkflowProgress(workflowId);
    
    if (!progressResult) {
      console.warn(`Progress calculation failed for workflow ${workflowId}`);
    } else {
      console.log(`Progress updated:`, {
        completionPercentage: progressResult.completionPercentage,
        isComplete: progressResult.isComplete,
        completedSteps: progressResult.completedSteps,
        totalSteps: progressResult.totalSteps
      });
    }

    // Return success response with updated progress
    return NextResponse.json({
      success: true,
      workflowId,
      stepUpdated: {
        stepId: payload.stepId,
        stepTitle: updatedStep.title,
        newStatus: payload.newStatus,
        stepIndex
      },
      progress: progressResult ? {
        completionPercentage: progressResult.completionPercentage,
        completedSteps: progressResult.completedSteps,
        totalSteps: progressResult.totalSteps,
        isComplete: progressResult.isComplete,
        currentStepTitle: progressResult.currentStepTitle
      } : null,
      workflowUpdated: true
    });

  } catch (error) {
    console.error('Error in step completion webhook:', error);
    
    return NextResponse.json({
      error: 'Failed to process step completion',
      details: error instanceof Error ? error.message : 'Unknown error',
      workflowId: (await params).id
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: workflowId } = await params;
    
    // Get current workflow progress
    const workflow = await WorkflowService.getGuestPostWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const progress = WorkflowProgressService.calculateWorkflowProgress(workflow);
    
    return NextResponse.json({
      workflowId,
      progress: {
        totalSteps: progress.totalSteps,
        completedSteps: progress.completedSteps,
        inProgressSteps: progress.inProgressSteps,
        pendingSteps: progress.pendingSteps,
        completionPercentage: progress.completionPercentage,
        isComplete: progress.isComplete,
        currentStepTitle: progress.currentStepTitle,
        lastCompletedStep: progress.lastCompletedStep
      },
      steps: workflow.steps.map((step, index) => ({
        id: step.id,
        title: step.title,
        status: step.status,
        index,
        completedAt: step.completedAt
      }))
    });

  } catch (error) {
    console.error('Error getting workflow progress:', error);
    return NextResponse.json({
      error: 'Failed to get workflow progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}