import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/db/workflowService';
import { WorkflowProgressService } from '@/lib/services/workflowProgressService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workflow = await WorkflowService.getGuestPostWorkflow(id);
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    console.log(`PUT /api/workflows/${id} - Starting workflow update`);
    console.log('Update data received:', JSON.stringify(data, null, 2));
    
    // Validate the workflow data structure
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid workflow data provided' },
        { status: 400 }
      );
    }

    // Check if workflow exists first
    const existingWorkflow = await WorkflowService.getWorkflow(id);
    if (!existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    console.log('Existing workflow found, updating...');

    // Prepare update data - store complete workflow as JSON in content field
    const updateData = {
      content: data, // Store the complete updated workflow as JSON
      updatedAt: new Date(),
      // Update title if provided
      ...(data.clientName && { title: data.clientName })
    };

    console.log('Final update data:', JSON.stringify(updateData, null, 2));

    // Update the workflow in database
    const updatedWorkflow = await WorkflowService.updateWorkflow(id, updateData);
    
    if (!updatedWorkflow) {
      return NextResponse.json(
        { error: 'Failed to update workflow in database' },
        { status: 500 }
      );
    }

    console.log('Workflow updated successfully:', updatedWorkflow.id);

    // Return the updated workflow in the expected format
    const result = WorkflowService.databaseToGuestPostWorkflow(updatedWorkflow);
    
    // Trigger progress calculation after workflow update
    console.log('Triggering progress calculation for workflow:', updatedWorkflow.id);
    try {
      const progressResult = await WorkflowProgressService.updateWorkflowProgress(updatedWorkflow.id);
      if (progressResult) {
        console.log(`Progress updated: ${progressResult.completedSteps}/${progressResult.totalSteps} steps (${progressResult.completionPercentage}%)`);
      }
    } catch (progressError) {
      console.error('Error updating workflow progress:', progressError);
      // Don't fail the main request if progress calculation fails
    }
    
    return NextResponse.json({ 
      success: true, 
      workflow: result 
    });

  } catch (error) {
    console.error('Error updating workflow:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await WorkflowService.deleteWorkflow(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}