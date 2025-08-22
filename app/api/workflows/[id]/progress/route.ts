import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/db/workflowService';
import { WorkflowProgressService } from '@/lib/services/workflowProgressService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;

    // Get the workflow
    const workflow = await WorkflowService.getGuestPostWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Calculate progress using the existing service
    const progress = WorkflowProgressService.calculateWorkflowProgress(workflow);

    return NextResponse.json({
      completionPercentage: progress.completionPercentage,
      currentStepTitle: progress.currentStepTitle,
      isComplete: progress.isComplete,
      totalSteps: progress.totalSteps,
      completedSteps: progress.completedSteps,
      currentStepIndex: progress.currentStepIndex
    });

  } catch (error) {
    console.error('Error fetching workflow progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow progress' },
      { status: 500 }
    );
  }
}