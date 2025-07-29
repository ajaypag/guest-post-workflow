import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/db/workflowService';
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
    } else if (data.workflow) {
      // New format - direct workflow object
      console.log('Using new format (workflow field)');
      guestWorkflow = data.workflow;
      userId = data.userId;
      userName = data.userName || guestWorkflow.createdBy;
      userEmail = data.userEmail || guestWorkflow.createdByEmail;
    } else {
      // Fallback - assume the entire data is the workflow
      console.log('Using fallback format (direct workflow)');
      guestWorkflow = data as GuestPostWorkflow;
      userId = data.userId || 'system'; // Fallback to 'system' if no userId
      userName = data.createdBy || 'System';
      userEmail = data.createdByEmail;
    }

    // Ensure we have required fields
    if (!guestWorkflow || !guestWorkflow.clientName) {
      console.error('Invalid workflow data:', guestWorkflow);
      return NextResponse.json(
        { error: 'Invalid workflow data' },
        { status: 400 }
      );
    }

    console.log('Creating workflow with:', {
      clientName: guestWorkflow.clientName,
      userId,
      userName,
      userEmail
    });

    const savedWorkflow = await WorkflowService.createGuestPostWorkflow(
      guestWorkflow,
      userId,
      userName,
      userEmail
    );
    
    console.log('Workflow created successfully:', savedWorkflow.id);
    return NextResponse.json({ 
      workflow: savedWorkflow,
      success: true 
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, workflow, userId } = data;

    if (!id || !workflow) {
      return NextResponse.json(
        { error: 'Workflow ID and data are required' },
        { status: 400 }
      );
    }

    const updatedWorkflow = await WorkflowService.updateWorkflow(id, {
      content: workflow,
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      workflow: updatedWorkflow,
      success: true 
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    await WorkflowService.deleteWorkflow(workflowId);

    return NextResponse.json({ 
      success: true,
      message: 'Workflow deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}