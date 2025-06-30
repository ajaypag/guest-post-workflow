import { GuestPostWorkflow } from '@/types/workflow';

const STORAGE_KEY = 'guest-post-workflows';

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

// Helper function to ensure workflow data is serializable
const prepareForStorage = (workflow: GuestPostWorkflow): any => {
  return {
    ...workflow,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
    steps: workflow.steps.map(step => ({
      ...step,
      completedAt: step.completedAt ? step.completedAt.toISOString() : undefined,
      inputs: step.inputs || {},
      outputs: step.outputs || {}
    }))
  };
};

export const storage = {
  getAllWorkflows: (): GuestPostWorkflow[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) 
        ? parsed.map(parseWorkflowDates)
        : [];
    } catch (error) {
      console.error('Error loading workflows from localStorage:', error);
      return [];
    }
  },

  getWorkflow: (id: string): GuestPostWorkflow | null => {
    try {
      const workflows = storage.getAllWorkflows();
      const workflow = workflows.find(w => w.id === id);
      return workflow || null;
    } catch (error) {
      console.error('Error getting workflow:', error);
      return null;
    }
  },

  saveWorkflow: (workflow: GuestPostWorkflow): void => {
    try {
      console.log('Saving workflow:', workflow.id);
      const workflows = storage.getAllWorkflows();
      const index = workflows.findIndex(w => w.id === workflow.id);
      
      const workflowToSave = prepareForStorage(workflow);
      
      if (index >= 0) {
        workflows[index] = parseWorkflowDates(workflowToSave);
      } else {
        workflows.push(parseWorkflowDates(workflowToSave));
      }
      
      const dataToStore = workflows.map(prepareForStorage);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
      console.log('Workflow saved successfully');
    } catch (error) {
      console.error('Error saving workflow:', error);
      throw error; // Re-throw to handle in UI
    }
  },

  deleteWorkflow: (id: string): void => {
    try {
      const workflows = storage.getAllWorkflows().filter(w => w.id !== id);
      const dataToStore = workflows.map(prepareForStorage);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  },

  exportWorkflow: (id: string): string => {
    const workflow = storage.getWorkflow(id);
    if (!workflow) throw new Error('Workflow not found');
    
    return JSON.stringify(prepareForStorage(workflow), null, 2);
  },

  exportAllWorkflows: (): string => {
    const workflows = storage.getAllWorkflows();
    return JSON.stringify(workflows.map(prepareForStorage), null, 2);
  }
};