import { GuestPostWorkflow } from '@/types/workflow';
import { AuthService } from './auth';

// Helper function to safely parse dates
const parseWorkflowDates = (workflow: any): GuestPostWorkflow => {
  return {
    ...workflow,
    createdAt: workflow.createdAt ? new Date(workflow.createdAt) : new Date(),
    updatedAt: workflow.updatedAt ? new Date(workflow.updatedAt) : new Date(),
    steps: workflow.steps?.map((step: any) => ({
      ...step,
      completedAt: step.completedAt ? new Date(step.completedAt) : undefined,
      inputs: step.inputs || {},
      outputs: step.outputs || {}
    })) || []
  };
};

export const storage = {
  getAllWorkflows: async (): Promise<GuestPostWorkflow[]> => {
    if (typeof window === 'undefined') return [];
    
    try {
      const session = AuthService.getSession();
      if (!session) return [];
      
      // For admin users, get all workflows. For regular users, filter by userId
      const url = session.role === 'admin' 
        ? '/api/workflows'  // Get all workflows for admin
        : `/api/workflows?userId=${session.userId}`;  // Filter for regular users
      
      const response = await fetch(url);
      if (!response.ok) return [];
      
      const { workflows } = await response.json();
      return workflows.map(parseWorkflowDates);
    } catch (error) {
      console.error('Error loading workflows from database:', error);
      return [];
    }
  },

  getWorkflow: async (id: string): Promise<GuestPostWorkflow | null> => {
    try {
      const response = await fetch(`/api/workflows/${id}`);
      if (!response.ok) return null;
      
      const { workflow } = await response.json();
      return workflow ? parseWorkflowDates(workflow) : null;
    } catch (error) {
      console.error('Error getting workflow:', error);
      return null;
    }
  },

  saveWorkflow: async (workflow: GuestPostWorkflow): Promise<void> => {
    try {
      console.log('Saving workflow:', workflow.id);
      const session = AuthService.getSession();
      if (!session) throw new Error('User not authenticated');
      
      // Check if workflow exists
      const existingResponse = await fetch(`/api/workflows/${workflow.id}`);
      const exists = existingResponse.ok;
      
      if (exists) {
        // Update existing workflow - send the complete workflow object
        console.log('Updating existing workflow via PUT:', workflow.id);
        const response = await fetch(`/api/workflows/${workflow.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workflow), // Send complete workflow object
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('PUT API Error Response:', response.status, errorText);
          throw new Error(`Failed to update workflow: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Workflow update API response:', result);
        
        // Validate that the update was actually successful
        if (!result.success) {
          throw new Error('Workflow update returned unsuccessful result');
        }
      } else {
        // Create new workflow - send the workflow directly
        console.log('Sending workflow to API:', workflow);
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...workflow,
            userId: session.userId // Add userId for API
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', response.status, errorText);
          throw new Error(`Failed to create workflow: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Workflow creation API response:', result);
      }
      console.log('Workflow saved successfully');
    } catch (error) {
      console.error('Error saving workflow:', error);
      throw error;
    }
  },

  deleteWorkflow: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  },

  exportWorkflow: async (id: string): Promise<string> => {
    const workflow = await storage.getWorkflow(id);
    if (!workflow) throw new Error('Workflow not found');
    
    return JSON.stringify(workflow, null, 2);
  },

  exportAllWorkflows: async (): Promise<string> => {
    const workflows = await storage.getAllWorkflows();
    return JSON.stringify(workflows, null, 2);
  }
};