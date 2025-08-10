import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { workflows } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export interface RefundCalculation {
  suggestedAmount: number;
  completionPercentage: number;
  completedItems: number;
  totalItems: number;
  breakdown: {
    itemId: string;
    status: string;
    completed: boolean;
    value: number;
  }[];
  reason: string;
  policyDetails: string;
}

export class RefundCalculationService {
  /**
   * Calculate suggested refund based on order completion status
   * Uses milestone-based approach for fair refund calculations
   */
  static async calculateSuggestedRefund(orderId: string): Promise<RefundCalculation> {
    try {
      // Get order with all related data
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          orderGroups: {
            with: {
              siteSubmissions: true
            }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Calculate completion for each order group
      const groupCalculations = await Promise.all(
        order.orderGroups.map(async (group) => {
          const submissions = group.siteSubmissions || [];
          const totalSites = submissions.length;
          
          if (totalSites === 0) {
            return {
              groupId: group.id,
              totalValue: 0,
              completedValue: 0,
              completedCount: 0,
              totalCount: 0,
              breakdown: []
            };
          }

          // Calculate value and completion for each submission
          const breakdown = await Promise.all(
            submissions.map(async (submission) => {
              const retailPrice = submission.retailPriceSnapshot || 0;
              
              // Check workflow completion status if workflow exists
              let workflowStatus = 'not_started';
              let completionValue = 0;
              
              if (submission.workflowId) {
                const workflow = await db.query.workflows.findFirst({
                  where: eq(workflows.id, submission.workflowId)
                });
                
                if (workflow) {
                  workflowStatus = workflow.status;
                  
                  // Milestone-based value calculation
                  // Each milestone represents partial completion
                  if (workflow.status === 'completed' && submission.publishedUrl) {
                    completionValue = retailPrice; // 100% value
                  } else if (workflow.status === 'completed') {
                    completionValue = retailPrice * 0.9; // 90% if completed but not published
                  } else if (workflow.currentStepSlug === 'final-polish') {
                    completionValue = retailPrice * 0.8; // 80% if in final polish
                  } else if (workflow.currentStepSlug === 'article-draft') {
                    completionValue = retailPrice * 0.6; // 60% if article drafted
                  } else if (workflow.currentStepSlug === 'content-audit') {
                    completionValue = retailPrice * 0.4; // 40% if content audit done
                  } else if (workflow.status === 'in_progress') {
                    completionValue = retailPrice * 0.2; // 20% if started
                  } else {
                    completionValue = 0; // No refund if not started
                  }
                }
              }
              
              // If submission was rejected by client, full refund for that item
              if (submission.submissionStatus === 'client_rejected') {
                completionValue = 0;
              }
              
              return {
                itemId: submission.id,
                domainId: submission.domainId,
                status: workflowStatus,
                submissionStatus: submission.submissionStatus,
                completed: workflowStatus === 'completed' && !!submission.publishedUrl,
                value: retailPrice,
                completedValue: completionValue,
                refundableValue: retailPrice - completionValue
              };
            })
          );

          const totalValue = breakdown.reduce((sum, item) => sum + item.value, 0);
          const completedValue = breakdown.reduce((sum, item) => sum + item.completedValue, 0);
          const completedCount = breakdown.filter(item => item.completed).length;

          return {
            groupId: group.id,
            clientName: group.client?.name,
            totalValue,
            completedValue,
            refundableValue: totalValue - completedValue,
            completedCount,
            totalCount: totalSites,
            breakdown
          };
        })
      );

      // Aggregate all groups
      const totalOrderValue = groupCalculations.reduce((sum, g) => sum + g.totalValue, 0);
      const totalCompletedValue = groupCalculations.reduce((sum, g) => sum + g.completedValue, 0);
      const totalRefundableValue = groupCalculations.reduce((sum, g) => sum + g.refundableValue, 0);
      const totalCompletedCount = groupCalculations.reduce((sum, g) => sum + g.completedCount, 0);
      const totalItemCount = groupCalculations.reduce((sum, g) => sum + g.totalCount, 0);

      // Calculate completion percentage
      const completionPercentage = totalOrderValue > 0 
        ? Math.round((totalCompletedValue / totalOrderValue) * 100)
        : 0;

      // Apply time-based adjustments
      const orderAge = Date.now() - new Date(order.createdAt).getTime();
      const daysOld = Math.floor(orderAge / (1000 * 60 * 60 * 24));
      
      let timeAdjustment = 1.0;
      let policyDetails = 'Standard refund policy applied.';
      
      if (daysOld > 60) {
        timeAdjustment = 0.8; // 20% reduction after 60 days
        policyDetails = 'Order is over 60 days old. 20% administrative fee applied.';
      } else if (daysOld > 30) {
        timeAdjustment = 0.9; // 10% reduction after 30 days
        policyDetails = 'Order is over 30 days old. 10% administrative fee applied.';
      }

      // Calculate final suggested refund
      const suggestedAmount = Math.round(totalRefundableValue * timeAdjustment);

      // Generate reason based on completion
      let reason = '';
      if (completionPercentage === 0) {
        reason = 'No work has been started on this order.';
      } else if (completionPercentage === 100) {
        reason = 'Order is fully completed. No refund recommended unless there are quality issues.';
      } else {
        reason = `${totalCompletedCount} of ${totalItemCount} items completed (${completionPercentage}% of order value delivered).`;
      }

      // Create simplified breakdown for response
      const simplifiedBreakdown = groupCalculations.flatMap(g => 
        g.breakdown.map(item => ({
          itemId: item.itemId,
          status: item.status,
          completed: item.completed,
          value: item.refundableValue
        }))
      );

      return {
        suggestedAmount,
        completionPercentage,
        completedItems: totalCompletedCount,
        totalItems: totalItemCount,
        breakdown: simplifiedBreakdown,
        reason,
        policyDetails
      };

    } catch (error: any) {
      console.error('Error calculating suggested refund:', error);
      throw new Error(`Failed to calculate refund: ${error.message}`);
    }
  }

  /**
   * Get refund policy based on order type and status
   */
  static getRefundPolicy(orderType: string, daysOld: number): {
    maxRefundPercentage: number;
    policyName: string;
    terms: string[];
  } {
    if (orderType === 'guest_post') {
      if (daysOld <= 7) {
        return {
          maxRefundPercentage: 100,
          policyName: 'Grace Period',
          terms: [
            'Full refund available within 7 days of order',
            'No questions asked cancellation'
          ]
        };
      } else if (daysOld <= 30) {
        return {
          maxRefundPercentage: 90,
          policyName: 'Standard Refund',
          terms: [
            'Refund based on work completed',
            '10% administrative fee may apply',
            'Published articles are non-refundable'
          ]
        };
      } else if (daysOld <= 60) {
        return {
          maxRefundPercentage: 80,
          policyName: 'Extended Timeline',
          terms: [
            'Refund based on work completed',
            '20% administrative fee applies',
            'Published articles are non-refundable',
            'Manager approval required'
          ]
        };
      } else {
        return {
          maxRefundPercentage: 50,
          policyName: 'Late Cancellation',
          terms: [
            'Maximum 50% refund available',
            'Only for unstarted work',
            'Executive approval required',
            'Case-by-case basis'
          ]
        };
      }
    }

    // Default policy for other order types
    return {
      maxRefundPercentage: 100,
      policyName: 'Standard Policy',
      terms: ['Refund based on completion status']
    };
  }

  /**
   * Calculate refund for bulk orders with special considerations
   */
  static async calculateBulkOrderRefund(orderIds: string[]): Promise<{
    orders: Array<{ orderId: string; calculation: RefundCalculation }>;
    totalSuggested: number;
    bulkDiscount?: number;
  }> {
    const calculations = await Promise.all(
      orderIds.map(async (orderId) => ({
        orderId,
        calculation: await this.calculateSuggestedRefund(orderId)
      }))
    );

    const totalSuggested = calculations.reduce(
      (sum, calc) => sum + calc.calculation.suggestedAmount, 
      0
    );

    // Apply bulk discount if processing multiple orders
    let bulkDiscount = 0;
    if (orderIds.length >= 5) {
      bulkDiscount = Math.round(totalSuggested * 0.05); // 5% discount for bulk processing
    }

    return {
      orders: calculations,
      totalSuggested: totalSuggested - bulkDiscount,
      bulkDiscount
    };
  }
}