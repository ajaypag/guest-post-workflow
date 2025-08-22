import { db } from '@/lib/db/connection';
import { workflows, workflowSteps, users } from '@/lib/db/schema';
import { orderSiteSelections, orderGroups } from '@/lib/db/orderGroupSchema';
import { orderItems, orders, orderStatusHistory } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import { WorkflowService } from '@/lib/db/workflowService';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowProgressService } from './workflowProgressService';

export interface WorkflowGenerationResult {
  success: boolean;
  workflowsCreated: number;
  orderItemsCreated: number;
  errors: string[];
}

export interface WorkflowGenerationOptions {
  assignToUserId?: string; // Optionally assign all generated workflows to a specific user
  autoAssign?: boolean; // Auto-assign based on workload
}

export class WorkflowGenerationService {
  /**
   * Generate workflows for line items in an order
   */
  static async generateWorkflowsForLineItems(
    orderId: string,
    userId: string,
    options: WorkflowGenerationOptions = {}
  ): Promise<WorkflowGenerationResult> {
    const errors: string[] = [];
    let workflowsCreated = 0;
    let orderItemsCreated = 0;

    try {
      // Import line items schema
      const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
      
      // Get all line items with assigned domains for this order
      const lineItems = await db.query.orderLineItems.findMany({
        where: and(
          eq(orderLineItems.orderId, orderId),
          sql`assigned_domain_id IS NOT NULL`
        ),
        with: {
          client: true
        }
      });

      if (!lineItems || lineItems.length === 0) {
        return {
          success: true,
          workflowsCreated: 0,
          orderItemsCreated: 0,
          errors: ['No line items with assigned domains found']
        };
      }

      // Get the order and account info
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          account: true
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Generate workflows for each line item with an assigned domain
      for (const lineItem of lineItems) {
        try {
          // Skip if already has a workflow
          if (lineItem.workflowId) {
            console.log(`Line item ${lineItem.id} already has workflow`);
            continue;
          }

          // Get domain details from bulk analysis
          const domain = lineItem.assignedDomainId ? 
            await db.query.bulkAnalysisDomains.findFirst({
              where: eq(bulkAnalysisDomains.id, lineItem.assignedDomainId)
            }) : null;

          if (!domain) {
            errors.push(`Domain not found for line item ${lineItem.id}`);
            continue;
          }

          // Determine assigned user
          const assignedUserId = options.assignToUserId || 
            (options.autoAssign ? await this.getNextAvailableUser() : userId);

          // Create workflow
          const workflow = await this.createWorkflowFromLineItem(
            lineItem,
            domain,
            order,
            assignedUserId
          );

          if (workflow) {
            workflowsCreated++;

            // Update line item with workflow reference
            await db.update(orderLineItems)
              .set({ 
                workflowId: workflow.id,
                modifiedAt: new Date()
              })
              .where(eq(orderLineItems.id, lineItem.id));

            // Create order item for backward compatibility
            const orderItem = await this.createOrderItemFromLineItem(
              lineItem,
              workflow.id,
              domain
            );

            if (orderItem) {
              orderItemsCreated++;
            }
          }
        } catch (error) {
          const errorMsg = `Failed to generate workflow for line item ${lineItem.id}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Update order tracking and state if workflows were created
      if (workflowsCreated > 0) {
        // Update order state to in_progress
        await db.update(orders)
          .set({
            state: 'in_progress',
            totalWorkflows: workflowsCreated,
            fulfillmentStartedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));

        // Add order status history entry for workflow generation
        await db.insert(orderStatusHistory)
          .values({
            id: uuidv4(),
            orderId,
            oldStatus: order.status,
            newStatus: order.status, // Status doesn't change, just tracking event
            changedBy: userId,
            changedAt: new Date(),
            notes: `Generated ${workflowsCreated} workflow${workflowsCreated > 1 ? 's' : ''} for fulfillment`
          });

        // Trigger order completion check to initialize tracking
        await WorkflowProgressService.checkOrderCompletion(orderId);
      }

      return {
        success: errors.length === 0,
        workflowsCreated,
        orderItemsCreated,
        errors
      };

    } catch (error) {
      console.error('Error generating workflows from line items:', error);
      return {
        success: false,
        workflowsCreated,
        orderItemsCreated,
        errors: [`System error: ${error}`]
      };
    }
  }

  /**
   * Create a workflow from a line item
   */
  private static async createWorkflowFromLineItem(
    lineItem: any,
    domain: any,
    order: any,
    userId: string
  ): Promise<GuestPostWorkflow | null> {
    try {
      const client = lineItem.client;
      const account = order.account;

      // Build workflow metadata
      const workflowData: GuestPostWorkflow = {
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        clientName: client.name,
        clientUrl: client.website,
        targetDomain: domain.domain,
        currentStep: 2, // Start at Topic Generation since first 2 steps completed for order-based workflows
        createdBy: account?.contactName || 'System',
        createdByEmail: account?.email,
        steps: this.generateWorkflowStepsForLineItem(lineItem, domain),
        metadata: {
          clientId: client.id,
          orderId: order.id,
          targetPageUrl: lineItem.targetPageUrl,
          anchorText: lineItem.anchorText
        }
      };

      // Create workflow using existing service
      const createdWorkflow = await WorkflowService.createGuestPostWorkflow(
        workflowData,
        userId,
        account?.contactName || 'System',
        account?.email
      );

      return createdWorkflow;
    } catch (error) {
      console.error('Error creating workflow from line item:', error);
      throw error;
    }
  }

  /**
   * Generate workflow steps for line item - FOR ORDER-BASED WORKFLOWS
   * Marks first 2 steps as completed since site selection & qualification are done for paid orders
   */
  private static generateWorkflowStepsForLineItem(lineItem: any, domain: any): any[] {
    return WORKFLOW_STEPS.map((step, index) => {
      // For order-based workflows, mark first 2 steps as completed
      const isFirstTwoSteps = index === 0 || index === 1;
      
      return {
        ...step,  // Spread ALL properties from WORKFLOW_STEPS including id, title, description
        status: isFirstTwoSteps ? 'completed' as const : 'pending' as const,
        inputs: index === 0 ? {
          domain: domain.domain,
          targetPageUrl: lineItem.targetPageUrl,
          anchorText: lineItem.anchorText,
          dr: domain.dr || 70,
          traffic: domain.totalTraffic || 10000,
          niche: domain.primaryNiche || 'General'
        } : {},
        outputs: index === 0 ? {
          domain: domain.domain
        } : index === 2 && lineItem.targetPageUrl ? {
          // Auto-populate Topic Generation (step 2) with target URL and anchor text
          clientTargetUrl: lineItem.targetPageUrl,
          desiredAnchorText: lineItem.anchorText || ''
        } : {},
        completedAt: isFirstTwoSteps ? new Date() : undefined
      };
    });
  }

  /**
   * Get pre-filled inputs for a workflow step from line item
   */
  private static getStepInputsForLineItem(stepId: string, lineItem: any, domain: any): Record<string, any> {
    switch (stepId) {
      case 'domain-selection':
        return {
          domain: domain.domain,
          targetPageUrl: lineItem.targetPageUrl,
          anchorText: lineItem.anchorText,
          dr: domain.dr || 70,
          traffic: domain.totalTraffic || 10000,
          niche: domain.primaryNiche || 'General'
        };
      
      case 'keyword-research':
        return {
          targetDomain: domain.domain,
          targetPage: lineItem.targetPageUrl,
          clientNiche: domain.clientNiche || '',
          competitorAnalysis: ''
        };
      
      default:
        return {};
    }
  }

  /**
   * Create an order item from line item for backward compatibility
   */
  private static async createOrderItemFromLineItem(
    lineItem: any,
    workflowId: string,
    domain: any
  ): Promise<any> {
    try {
      const orderItemData = {
        id: uuidv4(),
        orderId: lineItem.orderId,
        domainId: lineItem.assignedDomainId,
        domain: lineItem.assignedDomain || domain.domain,
        targetPageId: lineItem.targetPageId,
        lineItemId: lineItem.id, // Reference back to line item
        
        // Domain metrics snapshot
        domainRating: domain.dr || 70,
        traffic: domain.totalTraffic || 10000,
        retailPrice: lineItem.approvedPrice || lineItem.estimatedPrice || 17900, // Default $179 if no price
        wholesalePrice: lineItem.wholesalePrice || ((lineItem.estimatedPrice || 17900) - 7900), // Retail minus $79 service fee
        
        // Workflow tracking
        workflowId: workflowId,
        workflowStatus: 'pending',
        workflowCreatedAt: new Date(),
        
        // Status
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [orderItem] = await db.insert(orderItems)
        .values(orderItemData)
        .returning();

      return orderItem;
    } catch (error) {
      console.error('Error creating order item from line item:', error);
      throw error;
    }
  }
  /**
   * Generate workflows for all approved site selections in an order group
   */
  static async generateWorkflowsForOrderGroup(
    orderGroupId: string, 
    userId: string,
    options: WorkflowGenerationOptions = {}
  ): Promise<WorkflowGenerationResult> {
    const errors: string[] = [];
    let workflowsCreated = 0;
    let orderItemsCreated = 0;

    try {
      // Get order group with related data
      const orderGroup = await db.query.orderGroups.findFirst({
        where: eq(orderGroups.id, orderGroupId),
        with: {
          order: {
            with: {
              account: true
            }
          },
          client: true,
          siteSelections: {
            where: eq(orderSiteSelections.status, 'approved'),
            with: {
              domain: true
            }
          }
        }
      });

      if (!orderGroup) {
        throw new Error('Order group not found');
      }

      if (!orderGroup.siteSelections || orderGroup.siteSelections.length === 0) {
        return {
          success: true,
          workflowsCreated: 0,
          orderItemsCreated: 0,
          errors: ['No approved site selections found']
        };
      }

      // Generate workflows for each approved site
      for (const siteSelection of orderGroup.siteSelections) {
        try {
          // Skip if already has an order item (workflow already created)
          if (siteSelection.orderItemId) {
            console.log(`Site selection ${siteSelection.id} already has workflow`);
            continue;
          }

          // Determine assigned user
          const assignedUserId = options.assignToUserId || 
            (options.autoAssign ? await this.getNextAvailableUser() : userId);

          // Create workflow
          const workflow = await this.createWorkflowFromSiteSelection(
            siteSelection,
            orderGroup,
            assignedUserId
          );

          if (workflow) {
            workflowsCreated++;

            // Create order item
            const orderItem = await this.createOrderItem(
              orderGroup.orderId,
              siteSelection,
              workflow.id,
              orderGroup.id
            );

            if (orderItem) {
              orderItemsCreated++;

              // Update site selection with order item reference
              await db.update(orderSiteSelections)
                .set({ 
                  orderItemId: orderItem.id,
                  updatedAt: new Date()
                })
                .where(eq(orderSiteSelections.id, siteSelection.id));
            }
          }
        } catch (error) {
          const errorMsg = `Failed to generate workflow for domain ${siteSelection.domain?.domain}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Update order state if all workflows created successfully
      if (errors.length === 0 && workflowsCreated > 0) {
        await db.update(orders)
          .set({
            state: 'in_progress',
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderGroup.orderId));
      }

      return {
        success: errors.length === 0,
        workflowsCreated,
        orderItemsCreated,
        errors
      };

    } catch (error) {
      console.error('Error generating workflows:', error);
      return {
        success: false,
        workflowsCreated,
        orderItemsCreated,
        errors: [`System error: ${error}`]
      };
    }
  }

  /**
   * Create a workflow from an approved site selection
   */
  private static async createWorkflowFromSiteSelection(
    siteSelection: any,
    orderGroup: any,
    userId: string
  ): Promise<GuestPostWorkflow | null> {
    try {
      const domain = siteSelection.domain;
      const client = orderGroup.client;
      const account = orderGroup.order.account;

      // Build workflow metadata
      const workflowData: GuestPostWorkflow = {
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        clientName: client.name,
        clientUrl: client.website,
        targetDomain: domain.domain,
        currentStep: 0,
        createdBy: account?.contactName || 'System',
        createdByEmail: account?.email,
        steps: this.generateWorkflowSteps(siteSelection, domain),
        metadata: {
          clientId: client.id,
          orderId: orderGroup.orderId,
          orderGroupId: orderGroup.id,
          siteSelectionId: siteSelection.id,
          targetPageUrl: siteSelection.targetPageUrl,
          anchorText: siteSelection.anchorText
        }
      };

      // Create workflow using existing service
      const createdWorkflow = await WorkflowService.createGuestPostWorkflow(
        workflowData,
        userId,
        account?.contactName || 'System',
        account?.email
      );

      // Link workflow to order
      if (createdWorkflow) {
        await db.update(workflows)
          .set({
            orderItemId: siteSelection.id, // Temporary link until order item created
            updatedAt: new Date()
          })
          .where(eq(workflows.id, createdWorkflow.id));
      }

      return createdWorkflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Generate workflow steps with pre-filled data - EXACTLY like the frontend does it
   */
  private static generateWorkflowSteps(siteSelection: any, domain: any): any[] {
    return WORKFLOW_STEPS.map((step, index) => ({
      ...step,  // Spread ALL properties from WORKFLOW_STEPS including id, title, description
      status: 'pending' as const,
      inputs: index === 0 ? {
        domain: domain.domain,
        targetPageUrl: siteSelection.targetPageUrl,
        anchorText: siteSelection.anchorText,
        dr: domain.dr || 70,
        traffic: domain.totalTraffic || 10000,
        niche: domain.primaryNiche || 'General'
      } : {},
      outputs: index === 0 ? {
        domain: domain.domain
      } : {},
      completedAt: undefined
    }));
  }

  /**
   * Get pre-filled inputs for a workflow step
   */
  private static getStepInputs(stepId: string, siteSelection: any, domain: any): Record<string, any> {
    switch (stepId) {
      case 'domain-selection':
        return {
          domain: domain.domain,
          targetPageUrl: siteSelection.targetPageUrl,
          anchorText: siteSelection.anchorText,
          dr: domain.dr || 70,
          traffic: domain.totalTraffic || 10000,
          niche: domain.primaryNiche || 'General'
        };
      
      case 'keyword-research':
        return {
          targetDomain: domain.domain,
          targetPage: siteSelection.targetPageUrl,
          clientNiche: domain.clientNiche || '',
          competitorAnalysis: ''
        };
      
      default:
        return {};
    }
  }

  /**
   * Get input field definitions for a step
   */
  private static getStepInputFields(stepId: string): any[] {
    // This could be extracted to a configuration file
    switch (stepId) {
      case 'domain-selection':
        return [
          { name: 'domain', label: 'Target Domain', type: 'text' },
          { name: 'targetPageUrl', label: 'Target Page URL', type: 'url' },
          { name: 'anchorText', label: 'Anchor Text', type: 'text' }
        ];
      
      case 'keyword-research':
        return [
          { name: 'targetDomain', label: 'Target Domain', type: 'text' },
          { name: 'targetPage', label: 'Target Page', type: 'url' },
          { name: 'clientNiche', label: 'Client Niche', type: 'text' }
        ];
      
      default:
        return [];
    }
  }

  /**
   * Get output field definitions for a step
   */
  private static getStepOutputFields(stepId: string): any[] {
    // This could be extracted to a configuration file
    switch (stepId) {
      case 'domain-selection':
        return [
          { name: 'confirmedDomain', label: 'Confirmed Domain', type: 'text' },
          { name: 'siteMetrics', label: 'Site Metrics', type: 'textarea' }
        ];
      
      case 'keyword-research':
        return [
          { name: 'primaryKeywords', label: 'Primary Keywords', type: 'textarea' },
          { name: 'competitorInsights', label: 'Competitor Insights', type: 'textarea' }
        ];
      
      default:
        return [];
    }
  }

  /**
   * Create an order item for the workflow
   */
  private static async createOrderItem(
    orderId: string,
    siteSelection: any,
    workflowId: string,
    orderGroupId: string
  ): Promise<any> {
    try {
      // Calculate prices - wholesale from domain, retail adds $79 service fee
      const wholesalePrice = siteSelection.domain?.price || 10000; // Default $100 wholesale
      const retailPrice = wholesalePrice + 7900; // Add $79 service fee

      const orderItemData = {
        id: uuidv4(),
        orderId: orderId,
        domainId: siteSelection.domainId,
        domain: siteSelection.domain?.domain || 'unknown',
        targetPageId: null, // Will be set when target page is selected
        orderGroupId: orderGroupId,
        siteSelectionId: siteSelection.id,
        
        // Domain metrics snapshot
        domainRating: siteSelection.domain?.dr || 70,
        traffic: siteSelection.domain?.totalTraffic || 10000,
        retailPrice: retailPrice,
        wholesalePrice: wholesalePrice,
        
        // Workflow tracking
        workflowId: workflowId,
        workflowStatus: 'pending',
        workflowCreatedAt: new Date(),
        
        // Status
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [orderItem] = await db.insert(orderItems)
        .values(orderItemData)
        .returning();

      return orderItem;
    } catch (error) {
      console.error('Error creating order item:', error);
      throw error;
    }
  }

  /**
   * Generate workflows for all approved sites in an order
   */
  static async generateWorkflowsForOrder(
    orderId: string,
    userId: string,
    options: WorkflowGenerationOptions = {}
  ): Promise<WorkflowGenerationResult> {
    const errors: string[] = [];
    let totalWorkflowsCreated = 0;
    let totalOrderItemsCreated = 0;

    try {
      // Get all order groups for this order
      const groups = await db.query.orderGroups.findMany({
        where: eq(orderGroups.orderId, orderId)
      });

      // Generate workflows for each group
      for (const group of groups) {
        const result = await this.generateWorkflowsForOrderGroup(group.id, userId, options);
        totalWorkflowsCreated += result.workflowsCreated;
        totalOrderItemsCreated += result.orderItemsCreated;
        errors.push(...result.errors);
      }

      return {
        success: errors.length === 0,
        workflowsCreated: totalWorkflowsCreated,
        orderItemsCreated: totalOrderItemsCreated,
        errors
      };

    } catch (error) {
      console.error('Error generating workflows for order:', error);
      return {
        success: false,
        workflowsCreated: totalWorkflowsCreated,
        orderItemsCreated: totalOrderItemsCreated,
        errors: [`System error: ${error}`]
      };
    }
  }

  /**
   * Get the next available user for workflow assignment
   * Uses round-robin or workload-based assignment
   */
  private static async getNextAvailableUser(): Promise<string> {
    try {
      // Get all active internal users
      const activeUsers = await db.query.users.findMany({
        where: and(
          eq(users.isActive, true),
          eq(users.role, 'user')
        )
      });

      if (activeUsers.length === 0) {
        throw new Error('No active users available for assignment');
      }

      // Count active workflows per user
      const workflowCounts = await db
        .select({
          userId: workflows.userId,
          count: sql<number>`count(*)::int`
        })
        .from(workflows)
        .where(
          and(
            eq(workflows.status, 'active'),
            inArray(workflows.userId, activeUsers.map(u => u.id))
          )
        )
        .groupBy(workflows.userId);

      // Create a map of user workflow counts
      const countMap = new Map<string, number>(workflowCounts.map(wc => [wc.userId, wc.count]));

      // Find user with least workflows
      let minCount = Infinity;
      let selectedUser = activeUsers[0];

      for (const user of activeUsers) {
        const count = countMap.get(user.id) || 0;
        if (count < minCount) {
          minCount = count;
          selectedUser = user;
        }
      }

      return selectedUser.id;
    } catch (error) {
      console.error('Error getting next available user:', error);
      // Fallback to system user
      return '00000000-0000-0000-0000-000000000000';
    }
  }
}