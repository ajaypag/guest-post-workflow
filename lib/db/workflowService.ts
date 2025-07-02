import { eq, desc } from 'drizzle-orm';
import { db } from './connection';
import { workflows, workflowSteps, type Workflow, type NewWorkflow, type WorkflowStep, type NewWorkflowStep } from './schema';

export class WorkflowService {
  // Get all workflows for a user
  static async getUserWorkflows(userId: string): Promise<Workflow[]> {
    try {
      return await db
        .select()
        .from(workflows)
        .where(eq(workflows.createdBy, userId))
        .orderBy(desc(workflows.updatedAt));
    } catch (error) {
      console.error('Error loading user workflows:', error);
      return [];
    }
  }

  // Get all workflows (admin only)
  static async getAllWorkflows(): Promise<Workflow[]> {
    try {
      return await db
        .select()
        .from(workflows)
        .orderBy(desc(workflows.updatedAt));
    } catch (error) {
      console.error('Error loading all workflows:', error);
      return [];
    }
  }

  // Get workflow by ID
  static async getWorkflow(id: string): Promise<Workflow | null> {
    try {
      const result = await db.select().from(workflows).where(eq(workflows.id, id));
      return result[0] || null;
    } catch (error) {
      console.error('Error loading workflow:', error);
      return null;
    }
  }

  // Create new workflow
  static async createWorkflow(workflowData: Omit<NewWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    try {
      const result = await db.insert(workflows).values(workflowData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  // Update workflow
  static async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      const result = await db
        .update(workflows)
        .set(updateData)
        .where(eq(workflows.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating workflow:', error);
      return null;
    }
  }

  // Delete workflow
  static async deleteWorkflow(id: string): Promise<boolean> {
    try {
      const result = await db.delete(workflows).where(eq(workflows.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return false;
    }
  }

  // Workflow steps methods
  static async getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
    try {
      return await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, workflowId));
    } catch (error) {
      console.error('Error loading workflow steps:', error);
      return [];
    }
  }

  // Create workflow step
  static async createWorkflowStep(stepData: Omit<NewWorkflowStep, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowStep> {
    try {
      const result = await db.insert(workflowSteps).values(stepData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating workflow step:', error);
      throw error;
    }
  }

  // Update workflow step
  static async updateWorkflowStep(id: string, updates: Partial<WorkflowStep>): Promise<WorkflowStep | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      const result = await db
        .update(workflowSteps)
        .set(updateData)
        .where(eq(workflowSteps.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating workflow step:', error);
      return null;
    }
  }

  // Get workflow with steps (combined)
  static async getWorkflowWithSteps(id: string): Promise<{ workflow: Workflow; steps: WorkflowStep[] } | null> {
    try {
      const workflow = await this.getWorkflow(id);
      if (!workflow) {
        return null;
      }

      const steps = await this.getWorkflowSteps(id);
      return { workflow, steps };
    } catch (error) {
      console.error('Error loading workflow with steps:', error);
      return null;
    }
  }

  // Complete workflow step
  static async completeWorkflowStep(stepId: string, outputs: any = {}): Promise<WorkflowStep | null> {
    try {
      return await this.updateWorkflowStep(stepId, {
        status: 'completed',
        outputs,
        completedAt: new Date(),
      });
    } catch (error) {
      console.error('Error completing workflow step:', error);
      return null;
    }
  }

  // Advance workflow to next step
  static async advanceWorkflow(workflowId: string): Promise<Workflow | null> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        return null;
      }

      return await this.updateWorkflow(workflowId, {
        currentStep: workflow.currentStep + 1,
      });
    } catch (error) {
      console.error('Error advancing workflow:', error);
      return null;
    }
  }
}