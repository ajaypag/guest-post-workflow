import { GuestPostWorkflow } from '@/types/workflow';

const STORAGE_KEY = 'guest-post-workflows';

export const storage = {
  getAllWorkflows: (): GuestPostWorkflow[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getWorkflow: (id: string): GuestPostWorkflow | null => {
    const workflows = storage.getAllWorkflows();
    return workflows.find(w => w.id === id) || null;
  },

  saveWorkflow: (workflow: GuestPostWorkflow): void => {
    const workflows = storage.getAllWorkflows();
    const index = workflows.findIndex(w => w.id === workflow.id);
    
    if (index >= 0) {
      workflows[index] = workflow;
    } else {
      workflows.push(workflow);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  },

  deleteWorkflow: (id: string): void => {
    const workflows = storage.getAllWorkflows().filter(w => w.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  },

  exportWorkflow: (id: string): string => {
    const workflow = storage.getWorkflow(id);
    if (!workflow) throw new Error('Workflow not found');
    
    return JSON.stringify(workflow, null, 2);
  },

  exportAllWorkflows: (): string => {
    const workflows = storage.getAllWorkflows();
    return JSON.stringify(workflows, null, 2);
  }
};