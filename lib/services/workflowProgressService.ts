/**
 * Workflow Progress Service
 * 
 * Provides flexible progress calculation and tracking for workflows with any number of steps.
 * Designed to work with 5-step, 16-step, 50-step, or any custom workflow templates.
 * 
 * Key Features:
 * - Template-agnostic progress calculation
 * - Event-driven workflow completion detection  
 * - Order completion aggregation
 * - Performance tracking and analytics
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { workflows, orders } from '../db/schema';
import { orderLineItems } from '../db/orderLineItemSchema';
import { WorkflowService } from '../db/workflowService';
import { GuestPostWorkflow } from '@/types/workflow';

// Progress calculation result interface
export interface WorkflowProgress {
  totalSteps: number;
  completedSteps: number;
  inProgressSteps: number;
  pendingSteps: number;
  completionPercentage: number; // 0-100
  isComplete: boolean;
  currentStepIndex: number;
  currentStepTitle: string;
  lastCompletedStep?: {
    index: number;
    title: string;
    completedAt?: Date;
  };
}

// Order completion summary interface
export interface OrderCompletionSummary {
  totalWorkflows: number;
  completedWorkflows: number;
  completionPercentage: number; // 0-100
  isOrderComplete: boolean;
  workflowsInProgress: number;
  workflowsPending: number;
  averageWorkflowProgress: number;
  estimatedCompletionDate?: Date;
}

export class WorkflowProgressService {
  
  /**
   * Calculate flexible progress for any workflow structure
   * Works with 5 steps, 16 steps, 50 steps, or any custom template
   * 
   * @param workflow - GuestPostWorkflow with steps array
   * @returns WorkflowProgress with completion metrics
   */
  static calculateWorkflowProgress(workflow: GuestPostWorkflow): WorkflowProgress {
    if (!workflow.steps || workflow.steps.length === 0) {
      return {
        totalSteps: 0,
        completedSteps: 0,
        inProgressSteps: 0,
        pendingSteps: 0,
        completionPercentage: 0,
        isComplete: false,
        currentStepIndex: 0,
        currentStepTitle: 'No steps defined'
      };
    }

    // Detect if this is an order-based workflow (has orderId metadata)
    const isOrderWorkflow = !!workflow.metadata?.orderId;
    
    // For order workflows, exclude pre-completed steps from progress calculation
    const relevantSteps = isOrderWorkflow 
      ? workflow.steps.slice(2) // Skip first 2 pre-completed steps
      : workflow.steps;
    
    const totalSteps = relevantSteps.length;
    const completedSteps = relevantSteps.filter(s => s.status === 'completed').length;
    const inProgressSteps = relevantSteps.filter(s => s.status === 'in-progress').length;
    const pendingSteps = relevantSteps.filter(s => s.status === 'pending').length;
    
    const completionPercentage = totalSteps > 0 
      ? Math.round((completedSteps / totalSteps) * 100) 
      : 0;
    
    // For order workflows, check if all relevant steps are complete
    const isComplete = isOrderWorkflow 
      ? (completedSteps === totalSteps && totalSteps > 0) // Based on relevant steps only
      : (workflow.steps.filter(s => s.status === 'completed').length === workflow.steps.length && workflow.steps.length > 0); // All steps for manual workflows
    
    // Use the workflow's currentStep field
    const currentStepIndex = workflow.currentStep || 0;
    const currentStepTitle = workflow.steps[currentStepIndex]?.title || 'Unknown Step';
    
    // Find last completed step
    let lastCompletedStep: WorkflowProgress['lastCompletedStep'];
    const completedStepsWithIndex = workflow.steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step.status === 'completed')
      .sort((a, b) => {
        const aDate = a.step.completedAt ? new Date(a.step.completedAt).getTime() : 0;
        const bDate = b.step.completedAt ? new Date(b.step.completedAt).getTime() : 0;
        return bDate - aDate; // Most recent first
      });
    
    if (completedStepsWithIndex.length > 0) {
      const lastCompleted = completedStepsWithIndex[0];
      lastCompletedStep = {
        index: lastCompleted.index,
        title: lastCompleted.step.title,
        completedAt: lastCompleted.step.completedAt ? new Date(lastCompleted.step.completedAt) : undefined
      };
    }
    
    return {
      totalSteps, // This is now the relevant steps count (17 for orders, 19 for manual)
      completedSteps, // This is completed relevant steps only
      inProgressSteps,
      pendingSteps,
      completionPercentage, // Based on relevant steps only
      isComplete,
      currentStepIndex: currentStepIndex,
      currentStepTitle: currentStepTitle,
      lastCompletedStep
    };
  }

  /**
   * Update workflow progress in database
   * Triggers order completion check if workflow becomes complete
   * 
   * @param workflowId - ID of workflow to update
   * @returns Updated workflow progress
   */
  static async updateWorkflowProgress(workflowId: string): Promise<WorkflowProgress | null> {
    try {
      console.log(`WorkflowProgressService.updateWorkflowProgress - Starting for workflow ${workflowId}`);
      
      // Get current workflow
      const workflow = await WorkflowService.getGuestPostWorkflow(workflowId);
      if (!workflow) {
        console.error(`Workflow not found: ${workflowId}`);
        return null;
      }

      // Calculate current progress
      const progress = this.calculateWorkflowProgress(workflow);
      console.log(`Workflow ${workflowId} progress:`, {
        totalSteps: progress.totalSteps,
        completedSteps: progress.completedSteps,
        completionPercentage: progress.completionPercentage,
        isComplete: progress.isComplete
      });

      // Update workflow completion fields in database
      const updateData = {
        completionPercentage: progress.completionPercentage.toString(), // Convert to string for decimal field
        isCompleted: progress.isComplete,
        completedAt: progress.isComplete ? new Date() : null,
        lastStepCompletedAt: progress.lastCompletedStep?.completedAt || null,
        lastActiveAt: new Date(), // Mark as recently active
        updatedAt: new Date()
      };

      await db.update(workflows)
        .set(updateData)
        .where(eq(workflows.id, workflowId));

      console.log(`Updated workflow ${workflowId} completion fields`);

      // If workflow just became complete, check if order is complete
      if (progress.isComplete && workflow.metadata?.orderId) {
        console.log(`Workflow ${workflowId} completed - checking order completion`);
        await this.checkOrderCompletion(workflow.metadata.orderId);
      }

      return progress;

    } catch (error) {
      console.error(`Error updating workflow progress for ${workflowId}:`, error);
      return null;
    }
  }

  /**
   * Check and update order completion status
   * Aggregates progress from all workflows in the order
   * 
   * @param orderId - ID of order to check
   * @returns Order completion summary
   */
  static async checkOrderCompletion(orderId: string): Promise<OrderCompletionSummary | null> {
    try {
      console.log(`WorkflowProgressService.checkOrderCompletion - Starting for order ${orderId}`);
      
      // Get all workflows for this order via line items
      const orderWorkflows = await this.getWorkflowsForOrder(orderId);
      
      if (orderWorkflows.length === 0) {
        console.log(`No workflows found for order ${orderId}`);
        return null;
      }

      // Calculate order-level completion metrics
      const totalWorkflows = orderWorkflows.length;
      let completedWorkflows = 0;
      let workflowsInProgress = 0;
      let workflowsPending = 0;
      let totalProgress = 0;

      for (const workflow of orderWorkflows) {
        const progress = this.calculateWorkflowProgress(workflow);
        totalProgress += progress.completionPercentage;
        
        if (progress.isComplete) {
          completedWorkflows++;
        } else if (progress.inProgressSteps > 0) {
          workflowsInProgress++;
        } else {
          workflowsPending++;
        }
      }

      const orderCompletionPercentage = totalWorkflows > 0 
        ? Math.round((completedWorkflows / totalWorkflows) * 100)
        : 0;
      
      const averageWorkflowProgress = totalWorkflows > 0 
        ? Math.round(totalProgress / totalWorkflows)
        : 0;

      const isOrderComplete = completedWorkflows === totalWorkflows && totalWorkflows > 0;

      console.log(`Order ${orderId} completion summary:`, {
        totalWorkflows,
        completedWorkflows,
        orderCompletionPercentage,
        isOrderComplete
      });

      // Update order completion fields
      const orderUpdateData: any = {
        totalWorkflows,
        completedWorkflows,
        workflowCompletionPercentage: orderCompletionPercentage.toString(),
        fulfillmentCompletedAt: isOrderComplete ? new Date() : null,
        readyForDelivery: isOrderComplete, // Can be overridden by QA checks later
        updatedAt: new Date()
      };

      // Set fulfillment_started_at if this is the first workflow progress
      if (completedWorkflows > 0 || workflowsInProgress > 0) {
        const existingOrder = await db.query.orders.findFirst({
          where: eq(orders.id, orderId)
        });
        
        if (existingOrder && !existingOrder.fulfillmentStartedAt) {
          orderUpdateData.fulfillmentStartedAt = new Date();
        }
      }

      await db.update(orders)
        .set(orderUpdateData)
        .where(eq(orders.id, orderId));

      console.log(`Updated order ${orderId} completion fields`);

      // If order just became complete, trigger notifications (placeholder)
      if (isOrderComplete) {
        console.log(`Order ${orderId} completed - ready for client delivery`);
        // TODO: Trigger client notification
        // TODO: Update order state to 'completed'
      }

      const summary: OrderCompletionSummary = {
        totalWorkflows,
        completedWorkflows,
        completionPercentage: orderCompletionPercentage,
        isOrderComplete,
        workflowsInProgress,
        workflowsPending,
        averageWorkflowProgress
      };

      return summary;

    } catch (error) {
      console.error(`Error checking order completion for ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Get all workflows for an order
   * Queries via order line items that have workflow_id set
   * 
   * @param orderId - Order ID
   * @returns Array of workflows for the order
   */
  private static async getWorkflowsForOrder(orderId: string): Promise<GuestPostWorkflow[]> {
    try {
      // Get line items for this order that have workflows
      const lineItemsWithWorkflows = await db.query.orderLineItems.findMany({
        where: eq(orderLineItems.orderId, orderId),
        columns: {
          workflowId: true
        }
      });

      const workflowIds = lineItemsWithWorkflows
        .filter(item => item.workflowId)
        .map(item => item.workflowId as string);

      if (workflowIds.length === 0) {
        return [];
      }

      // Get all workflows for these IDs
      const workflows: GuestPostWorkflow[] = [];
      for (const workflowId of workflowIds) {
        const workflow = await WorkflowService.getGuestPostWorkflow(workflowId);
        if (workflow) {
          workflows.push(workflow);
        }
      }

      return workflows;

    } catch (error) {
      console.error(`Error getting workflows for order ${orderId}:`, error);
      return [];
    }
  }

  /**
   * Get progress summary for multiple workflows
   * Useful for dashboard displays and bulk operations
   * 
   * @param workflowIds - Array of workflow IDs
   * @returns Progress summaries for all workflows
   */
  static async getBulkWorkflowProgress(workflowIds: string[]): Promise<Map<string, WorkflowProgress>> {
    const progressMap = new Map<string, WorkflowProgress>();

    for (const workflowId of workflowIds) {
      try {
        const workflow = await WorkflowService.getGuestPostWorkflow(workflowId);
        if (workflow) {
          const progress = this.calculateWorkflowProgress(workflow);
          progressMap.set(workflowId, progress);
        }
      } catch (error) {
        console.error(`Error calculating progress for workflow ${workflowId}:`, error);
      }
    }

    return progressMap;
  }

  /**
   * Get order progress summary
   * Includes all workflows and their current status
   * 
   * @param orderId - Order ID
   * @returns Detailed order progress information
   */
  static async getOrderProgressSummary(orderId: string): Promise<{
    order: OrderCompletionSummary;
    workflows: Array<{
      workflowId: string;
      progress: WorkflowProgress;
      targetDomain?: string;
      assignedUser?: string;
    }>;
  } | null> {
    try {
      const orderWorkflows = await this.getWorkflowsForOrder(orderId);
      const orderSummary = await this.checkOrderCompletion(orderId);
      
      if (!orderSummary) {
        return null;
      }

      const workflowDetails = orderWorkflows.map(workflow => ({
        workflowId: workflow.id,
        progress: this.calculateWorkflowProgress(workflow),
        targetDomain: workflow.targetDomain,
        assignedUser: workflow.createdBy // Can be enhanced with actual assignment data
      }));

      return {
        order: orderSummary,
        workflows: workflowDetails
      };

    } catch (error) {
      console.error(`Error getting order progress summary for ${orderId}:`, error);
      return null;
    }
  }
}