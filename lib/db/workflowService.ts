import { eq, desc } from 'drizzle-orm';
import { db } from './connection';
import { workflows, workflowSteps, type Workflow, type NewWorkflow, type WorkflowStep, type NewWorkflowStep } from './schema';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import crypto from 'crypto';

export class WorkflowService {
  // Transform GuestPostWorkflow to database format
  static guestPostWorkflowToDatabase(guestWorkflow: GuestPostWorkflow, userId: string, userName: string, userEmail?: string): {
    workflow: Omit<NewWorkflow, 'id' | 'createdAt' | 'updatedAt'>;
    steps: Omit<NewWorkflowStep, 'id' | 'workflowId' | 'createdAt' | 'updatedAt'>[];
  } {
    const workflow = {
      clientName: guestWorkflow.clientName,
      clientUrl: guestWorkflow.clientUrl,
      targetDomain: guestWorkflow.targetDomain || '',
      currentStep: guestWorkflow.currentStep,
      userId: userId, // Fixed: use userId instead of createdBy
      createdByName: userName,
      createdByEmail: userEmail,
      clientId: guestWorkflow.metadata?.clientId || null,
    };

    const steps = guestWorkflow.steps.map((step, index) => ({
      stepNumber: index + 1,
      title: step.title,
      description: step.description,
      status: step.status,
      inputs: step.inputs || {},
      outputs: step.outputs || {},
      completedAt: step.completedAt || null,
    }));

    return { workflow, steps };
  }

  // Transform database records to GuestPostWorkflow format
  static databaseToGuestPostWorkflow(
    workflow: Workflow, 
    steps: WorkflowStep[]
  ): GuestPostWorkflow {
    // Sort steps by stepNumber
    const sortedSteps = steps.sort((a, b) => a.stepNumber - b.stepNumber);

    return {
      id: workflow.id,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      clientName: workflow.clientName,
      clientUrl: workflow.clientUrl,
      targetDomain: workflow.targetDomain || '',
      currentStep: workflow.currentStep,
      createdBy: workflow.createdByName, // Use name, not ID
      createdByEmail: workflow.createdByEmail || undefined,
      steps: sortedSteps.map(step => ({
        id: step.id,
        title: step.title,
        description: step.description || '',
        status: step.status as 'pending' | 'in-progress' | 'completed',
        inputs: step.inputs || {},
        outputs: step.outputs || {},
        completedAt: step.completedAt || undefined,
      })),
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

      // Get steps for each workflow and transform to GuestPostWorkflow format
      const guestPostWorkflows = await Promise.all(
        workflowList.map(async (workflow) => {
          const steps = await this.getWorkflowSteps(workflow.id);
          return this.databaseToGuestPostWorkflow(workflow, steps);
        })
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

      const steps = await this.getWorkflowSteps(id);
      return this.databaseToGuestPostWorkflow(workflow, steps);
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

      // Transform to database format
      const { workflow: workflowData, steps: stepsData } = this.guestPostWorkflowToDatabase(
        guestWorkflow, 
        userId, 
        userName, 
        userEmail
      );

      console.log('Transformed workflow data:', workflowData);
      console.log('Transformed steps data count:', stepsData.length);

      // Create workflow record with explicit values instead of relying on database defaults
      console.log('Creating workflow record...');
      const now = new Date();
      const workflowId = crypto.randomUUID();
      
      const insertData = {
        id: workflowId,
        ...workflowData,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('Final insertData:', JSON.stringify(insertData, null, 2));
      
      let createdWorkflow;
      try {
        createdWorkflow = await db.insert(workflows).values(insertData).returning();
      } catch (insertError) {
        console.error('Database insert error details:', insertError);
        if (insertError && typeof insertError === 'object') {
          console.error('Error code:', (insertError as any).code);
          console.error('Error message:', (insertError as any).message);
          console.error('Error detail:', (insertError as any).detail);
        }
        throw insertError;
      }
      const workflow = createdWorkflow[0];
      console.log('Workflow record created:', workflow.id);

      // Create workflow steps with explicit values
      console.log('Creating workflow steps...');
      const stepPromises = stepsData.map((stepData, index) => {
        console.log(`Creating step ${index + 1}:`, stepData.title);
        const stepId = crypto.randomUUID();
        return db.insert(workflowSteps).values({
          id: stepId,
          ...stepData,
          workflowId: workflow.id,
          createdAt: now,
          updatedAt: now
        }).returning();
      });

      const createdSteps = await Promise.all(stepPromises);
      const steps = createdSteps.map(result => result[0]);
      console.log('All workflow steps created:', steps.length);

      // Transform back to GuestPostWorkflow format
      const result = this.databaseToGuestPostWorkflow(workflow, steps);
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