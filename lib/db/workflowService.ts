import { eq, desc } from 'drizzle-orm';
import { db } from './connection';
import { workflows, workflowSteps, type Workflow, type NewWorkflow, type WorkflowStep, type NewWorkflowStep } from './schema';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';

export class WorkflowService {
  // Transform GuestPostWorkflow to database format (simplified for JSON storage)
  static guestPostWorkflowToDatabase(guestWorkflow: GuestPostWorkflow, userId: string): {
    id: string;
    userId: string;
    clientId: string | null;
    title: string;
    status: string;
    content: any;
    targetPages: any[];
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: crypto.randomUUID(),
      userId: userId,
      clientId: guestWorkflow.metadata?.clientId || null,
      title: guestWorkflow.clientName,
      status: 'active',
      content: guestWorkflow, // Store entire workflow as JSON
      targetPages: [], // Empty for now
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Transform database records to GuestPostWorkflow format (simplified for JSON storage)
  static databaseToGuestPostWorkflow(workflow: any): GuestPostWorkflow {
    // If content exists, return it directly (it's the stored GuestPostWorkflow)
    if (workflow.content && typeof workflow.content === 'object') {
      return {
        ...workflow.content,
        id: workflow.id, // Ensure we use the database ID
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
      };
    }

    // Fallback for malformed data
    return {
      id: workflow.id,
      createdAt: new Date(workflow.createdAt),
      updatedAt: new Date(workflow.updatedAt),
      clientName: workflow.title || 'Unknown Client',
      clientUrl: '',
      targetDomain: '',
      currentStep: 0,
      createdBy: 'Unknown User',
      steps: [],
      metadata: {
        clientId: workflow.clientId || undefined,
      },
    };
  }
  // Get all workflows for a user (returns GuestPostWorkflow format)
  static async getUserGuestPostWorkflows(userId: string): Promise<GuestPostWorkflow[]> {
    try {
      const workflowList = await db
        .select()
        .from(workflows)
        .where(eq(workflows.userId, userId))
        .orderBy(desc(workflows.updatedAt));

      // Transform to GuestPostWorkflow format (no steps table needed)
      const guestPostWorkflows = workflowList.map(workflow => 
        this.databaseToGuestPostWorkflow(workflow)
      );

      return guestPostWorkflows;
    } catch (error) {
      console.error('Error loading user workflows:', error);
      return [];
    }
  }

  // Get all workflows for a user (database format - keep for internal use)
  static async getUserWorkflows(userId: string): Promise<Workflow[]> {
    try {
      return await db
        .select()
        .from(workflows)
        .where(eq(workflows.userId, userId))
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

  // Get workflow by ID (returns GuestPostWorkflow format)
  static async getGuestPostWorkflow(id: string): Promise<GuestPostWorkflow | null> {
    try {
      const workflow = await this.getWorkflow(id);
      if (!workflow) return null;

      return this.databaseToGuestPostWorkflow(workflow);
    } catch (error) {
      console.error('Error loading guest post workflow:', error);
      return null;
    }
  }

  // Get workflow by ID (database format - keep for internal use)
  static async getWorkflow(id: string): Promise<Workflow | null> {
    try {
      const result = await db.select().from(workflows).where(eq(workflows.id, id));
      return result[0] || null;
    } catch (error) {
      console.error('Error loading workflow:', error);
      return null;
    }
  }

  // Create new workflow from GuestPostWorkflow format
  static async createGuestPostWorkflow(
    guestWorkflow: GuestPostWorkflow, 
    userId: string, 
    userName: string, 
    userEmail?: string
  ): Promise<GuestPostWorkflow> {
    try {
      console.log('WorkflowService.createGuestPostWorkflow - Starting', {
        workflowId: guestWorkflow.id,
        userId,
        userName,
        stepCount: guestWorkflow.steps?.length
      });

      // Transform to database format (simplified for JSON storage)
      const workflowData = this.guestPostWorkflowToDatabase(guestWorkflow, userId);
      
      console.log('Final workflow data to insert:', JSON.stringify(workflowData, null, 2));
      
      // Insert workflow record
      console.log('Creating workflow record...');
      const createdWorkflow = await db.insert(workflows).values(workflowData).returning();
      const workflow = createdWorkflow[0];
      console.log('Workflow record created:', workflow.id);

      // Transform back to GuestPostWorkflow format
      const result = this.databaseToGuestPostWorkflow(workflow);
      console.log('Workflow creation completed successfully');
      return result;
    } catch (error) {
      console.error('Error creating guest post workflow:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('Error message:', error.message);
      }
      if (error && typeof error === 'object' && 'stack' in error) {
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  // Create new workflow (database format - keep for internal use)
  static async createWorkflow(workflowData: Omit<NewWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    try {
      const now = new Date();
      const insertData = {
        id: crypto.randomUUID(),
        ...workflowData,
        createdAt: now,
        updatedAt: now
      };
      const result = await db.insert(workflows).values(insertData).returning();
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
      const now = new Date();
      const insertData = {
        id: crypto.randomUUID(),
        ...stepData,
        createdAt: now,
        updatedAt: now
      };
      const result = await db.insert(workflowSteps).values(insertData).returning();
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

  // Note: Workflow advancement is now handled within the JSON content
}