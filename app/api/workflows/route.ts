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
      workflows = allWorkflows.map(workflow => 
        WorkflowService.databaseToGuestPostWorkflow(workflow)
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
    console.log('POST /api/workflows - Starting workflow creation');
    const data = await request.json();
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    // Check if this is the old format with workflow data
    let guestWorkflow: GuestPostWorkflow;
    let userId: string;
    let userName: string;
    let userEmail: string | undefined;

    if (data.content && typeof data.content === 'string') {
      // Old format - extract from content field
      console.log('Using old format (content field)');
      guestWorkflow = JSON.parse(data.content);
      userId = data.userId;
      userName = guestWorkflow.createdBy;
      userEmail = guestWorkflow.createdByEmail;
    } else if (data.clientName && data.steps) {
      // New format - direct GuestPostWorkflow
      console.log('Using new format (direct workflow)');
      guestWorkflow = data;
      userId = data.userId || 'placeholder-user-id'; // Use placeholder if not provided
      userName = guestWorkflow.createdBy;
      userEmail = guestWorkflow.createdByEmail;
    } else {
      console.error('Invalid data format received:', Object.keys(data));
      throw new Error(`Invalid workflow data format. Received keys: ${Object.keys(data).join(', ')}`);
    }

    console.log('Processed workflow data:', {
      workflowId: guestWorkflow.id,
      clientName: guestWorkflow.clientName,
      userId,
      userName,
      stepCount: guestWorkflow.steps?.length
    });

    const createdWorkflow = await WorkflowService.createGuestPostWorkflow(
      guestWorkflow,
      userId,
      userName,
      userEmail
    );

    console.log('Workflow created successfully:', createdWorkflow.id);
    return NextResponse.json({ workflow: createdWorkflow });
  } catch (error) {
    console.error('Error creating workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create workflow';
    console.error('Full error details:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}