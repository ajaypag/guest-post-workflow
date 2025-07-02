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
      
      const response = await fetch(`/api/workflows?userId=${session.userId}`);
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
        // Update existing workflow
        const response = await fetch(`/api/workflows/${workflow.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId: workflow.metadata?.clientId,
            title: workflow.clientName, // Using clientName as title
            status: 'active', // Default status
            content: JSON.stringify(workflow),
            targetPages: [],
            steps: workflow.steps
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update workflow');
        }
      } else {
        // Create new workflow
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: workflow.id,
            userId: session.userId,
            clientId: workflow.metadata?.clientId,
            title: workflow.clientName, // Using clientName as title
            status: 'active', // Default status
            content: JSON.stringify(workflow),
            targetPages: [],
            steps: workflow.steps
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create workflow');
        }
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