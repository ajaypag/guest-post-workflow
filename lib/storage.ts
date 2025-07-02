import { GuestPostWorkflow } from '@/types/workflow';
import { WorkflowService } from './db/workflowService';
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
      
      const workflows = await WorkflowService.getUserWorkflows(session.userId);
      return workflows.map(parseWorkflowDates);
    } catch (error) {
      console.error('Error loading workflows from database:', error);
      return [];
    }
  },

  getWorkflow: async (id: string): Promise<GuestPostWorkflow | null> => {
    try {
      const workflow = await WorkflowService.getWorkflow(id);
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
      
      const existing = await WorkflowService.getWorkflow(workflow.id);
      if (existing) {
        await WorkflowService.updateWorkflow(workflow.id, {
          clientId: workflow.clientId,
          title: workflow.title,
          status: workflow.status,
          content: workflow.content,
          targetPages: workflow.targetPages,
          steps: workflow.steps
        });
      } else {
        await WorkflowService.createWorkflow({
          id: workflow.id,
          userId: session.userId,
          clientId: workflow.clientId,
          title: workflow.title,
          status: workflow.status,
          content: workflow.content,
          targetPages: workflow.targetPages,
          steps: workflow.steps
        });
      }
      console.log('Workflow saved successfully');
    } catch (error) {
      console.error('Error saving workflow:', error);
      throw error;
    }
  },

  deleteWorkflow: async (id: string): Promise<void> => {
    try {
      await WorkflowService.deleteWorkflow(id);
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