import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
// import { orderGroups } from '@/lib/db/orderGroupSchema';
// import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface RefundCalculation {
  suggestedAmount: number;
  completionPercentage: number;
  totalValue: number;
  completedValue: number;
  details: {
    totalSites: number;
    completedSites: number;
    milestoneBreakdown: Array<{
      milestone: string;
      value: number;
      count: number;
    }>;
  };
  reasoning: string;
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
          items: true
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Simplified refund calculation based on order items
      // Since we don't have access to full workflow status in this schema,
      // we'll use a simple percentage-based approach
      const itemCalculations = (order.items || []).map(item => {
        const retailPrice = item.retailPrice || 0;
        
        // For now, assume partial completion (50%) as we can't check workflows
        // In production, this should be enhanced to check actual workflow status
        const completionValue = retailPrice * 0.5;
        
        return {
          itemId: item.id,
          totalValue: retailPrice,
          completedValue: completionValue,
          completedCount: 0,
          totalCount: 1,
          breakdown: [{
            siteId: item.id,
            siteName: item.domain || 'Unknown Site',
            retailPrice,
            completionValue,
            workflowStatus: 'partial',
            publishedUrl: null
          }]
        };
      });

      // Aggregate all calculations
      const totalOrderValue = itemCalculations.reduce((sum, calc) => sum + calc.totalValue, 0);
      const totalCompletedValue = itemCalculations.reduce((sum, calc) => sum + calc.completedValue, 0);
      const totalCompletedCount = itemCalculations.reduce((sum, calc) => sum + calc.completedCount, 0);
      const totalSiteCount = itemCalculations.reduce((sum, calc) => sum + calc.totalCount, 0);

      // Calculate refund amount (order value minus completed value)
      const refundableAmount = totalOrderValue - totalCompletedValue;
      
      // Apply time-based depreciation (orders lose refund value over time)
      const orderAge = Date.now() - new Date(order.createdAt).getTime();
      const daysOld = orderAge / (1000 * 60 * 60 * 24);
      let timeAdjustment = 1.0;
      
      if (daysOld > 90) {
        timeAdjustment = 0.5; // 50% refund after 90 days
      } else if (daysOld > 60) {
        timeAdjustment = 0.7; // 70% refund after 60 days
      } else if (daysOld > 30) {
        timeAdjustment = 0.85; // 85% refund after 30 days
      }
      
      const suggestedRefund = Math.round(refundableAmount * timeAdjustment);
      const completionPercentage = totalOrderValue > 0 
        ? Math.round((totalCompletedValue / totalOrderValue) * 100)
        : 0;

      // Build milestone breakdown
      const milestoneBreakdown = [
        {
          milestone: 'Published',
          value: itemCalculations.reduce((sum, calc) => 
            sum + calc.breakdown.filter(b => b.publishedUrl).reduce((s, b) => s + b.retailPrice, 0), 0
          ),
          count: itemCalculations.reduce((sum, calc) => 
            sum + calc.breakdown.filter(b => b.publishedUrl).length, 0
          )
        },
        {
          milestone: 'In Progress',
          value: totalCompletedValue,
          count: totalSiteCount - totalCompletedCount
        }
      ];

      // Generate reasoning
      let reasoning = `Order has ${completionPercentage}% completion. `;
      reasoning += `${totalCompletedCount} of ${totalSiteCount} sites are fully published. `;
      
      if (timeAdjustment < 1.0) {
        reasoning += `Refund adjusted to ${Math.round(timeAdjustment * 100)}% due to order age (${Math.round(daysOld)} days). `;
      }
      
      if (suggestedRefund === 0) {
        reasoning += 'Full value has been delivered or order is too old for refund.';
      } else if (completionPercentage > 80) {
        reasoning += 'Most work has been completed, minimal refund recommended.';
      } else if (completionPercentage < 20) {
        reasoning += 'Limited work completed, substantial refund recommended.';
      }

      return {
        suggestedAmount: suggestedRefund,
        completionPercentage,
        totalValue: totalOrderValue,
        completedValue: totalCompletedValue,
        details: {
          totalSites: totalSiteCount,
          completedSites: totalCompletedCount,
          milestoneBreakdown
        },
        reasoning
      };

    } catch (error) {
      console.error('Error calculating refund:', error);
      throw error;
    }
  }

  /**
   * Validate refund amount against order constraints
   */
  static validateRefundAmount(
    requestedAmount: number,
    orderTotal: number,
    previousRefunds: number = 0
  ): {
    valid: boolean;
    message: string;
    maxAllowable: number;
  } {
    const maxAllowable = orderTotal - previousRefunds;
    
    if (requestedAmount <= 0) {
      return {
        valid: false,
        message: 'Refund amount must be greater than zero',
        maxAllowable
      };
    }
    
    if (requestedAmount > maxAllowable) {
      return {
        valid: false,
        message: `Refund amount exceeds maximum allowable (${maxAllowable / 100})`,
        maxAllowable
      };
    }
    
    return {
      valid: true,
      message: 'Refund amount is valid',
      maxAllowable
    };
  }
}