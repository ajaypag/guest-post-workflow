import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/db/workflowService';
import { AuthService } from '@/lib/auth';
import { GuestPostWorkflow } from '@/types/workflow';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let workflows;
    if (userId) {
      workflows = await WorkflowService.getUserGuestPostWorkflows(userId);
    } else {
      // For admin - get all workflows and transform them
      const allWorkflows = await WorkflowService.getAllWorkflows();
      workflows = await Promise.all(
        allWorkflows.map(async (workflow) => {
          const steps = await WorkflowService.getWorkflowSteps(workflow.id);
          return WorkflowService.databaseToGuestPostWorkflow(workflow, steps);
        })
      );
    }

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check if this is the old format with workflow data
    let guestWorkflow: GuestPostWorkflow;
    let userId: string;
    let userName: string;
    let userEmail: string | undefined;

    if (data.content && typeof data.content === 'string') {
      // Old format - extract from content field
      guestWorkflow = JSON.parse(data.content);
      userId = data.userId;
      userName = guestWorkflow.createdBy;
      userEmail = guestWorkflow.createdByEmail;
    } else if (data.clientName && data.steps) {
      // New format - direct GuestPostWorkflow
      guestWorkflow = data;
      userId = data.userId || guestWorkflow.createdBy; // fallback
      userName = guestWorkflow.createdBy;
      userEmail = guestWorkflow.createdByEmail;
    } else {
      throw new Error('Invalid workflow data format');
    }

    const createdWorkflow = await WorkflowService.createGuestPostWorkflow(
      guestWorkflow,
      userId,
      userName,
      userEmail
    );

    return NextResponse.json({ workflow: createdWorkflow });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create workflow' },
      { status: 500 }
    );
  }
}