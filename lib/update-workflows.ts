import { storage } from './storage';
import { WORKFLOW_STEPS } from '@/types/workflow';

/**
 * Updates all existing workflows to include new steps from WORKFLOW_STEPS
 */
export async function updateAllWorkflowsWithNewSteps() {
  try {
    const workflows = await storage.getAllWorkflows();
    let updatedCount = 0;

    workflows.forEach(async (workflow) => {
      // Check if workflow needs updating (missing steps)
      const needsUpdate = workflow.steps.length < WORKFLOW_STEPS.length;
      
      if (needsUpdate) {
        // Add missing steps
        const missingSteps = WORKFLOW_STEPS.slice(workflow.steps.length).map(step => ({
          ...step,
          status: 'pending' as const,
          inputs: {},
          outputs: {},
          completedAt: undefined
        }));

        const updatedWorkflow = {
          ...workflow,
          updatedAt: new Date(),
          steps: [...workflow.steps, ...missingSteps]
        };

        await storage.saveWorkflow(updatedWorkflow);
        updatedCount++;
      }
    });

    console.log(`Updated ${updatedCount} workflows with new steps`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating workflows:', error);
    throw error;
  }
}