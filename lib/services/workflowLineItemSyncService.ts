/**
 * Workflow Line Item Sync Service
 * Handles syncing verification results and workflow completion back to order line items
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { workflows } from '@/lib/db/schema';
import { VerificationResult } from './publicationVerificationService';

export interface SyncResult {
  success: boolean;
  lineItemId?: string;
  error?: string;
}

export class WorkflowLineItemSyncService {
  
  /**
   * Find line item by workflow ID
   */
  static async findLineItemByWorkflowId(workflowId: string): Promise<any | null> {
    try {
      console.log(`[WorkflowLineItemSyncService] Finding line item for workflow ${workflowId}`);
      
      const result = await db
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.workflowId, workflowId))
        .limit(1);
      
      if (result.length === 0) {
        console.log(`[WorkflowLineItemSyncService] No line item found for workflow ${workflowId}`);
        return null;
      }
      
      console.log(`[WorkflowLineItemSyncService] Found line item ${result[0].id}`);
      return result[0];
      
    } catch (error) {
      console.error('[WorkflowLineItemSyncService] Error finding line item:', error);
      return null;
    }
  }

  /**
   * Sync verification results to line item
   */
  static async syncVerificationToLineItem(
    workflowId: string,
    verificationResult: VerificationResult,
    publishedUrl: string,
    userId?: string,
    forceDeliver: boolean = false,
    effectiveScore?: { passed: number; total: number; overallPassed: boolean },
    manualOverrides?: Record<string, boolean>
  ): Promise<SyncResult> {
    try {
      console.log(`[WorkflowLineItemSyncService] Starting sync for workflow ${workflowId}`);
      
      // Find the line item
      const lineItem = await this.findLineItemByWorkflowId(workflowId);
      
      if (!lineItem) {
        // This might be a manual workflow without a line item
        console.log(`[WorkflowLineItemSyncService] No line item to update for workflow ${workflowId}`);
        return {
          success: true,
          error: 'No associated line item found (might be manual workflow)'
        };
      }
      
      // Prepare metadata update
      const existingMetadata = lineItem.metadata || {};
      
      // Use effective score if provided (includes manual overrides), otherwise fall back to raw score
      const finalScore = effectiveScore || {
        passed: verificationResult.score.criticalPassed,
        total: verificationResult.score.criticalTotal,
        overallPassed: verificationResult.score.overallPassed
      };
      
      // Compute effective checks that include manual overrides
      const effectiveCriticalChecks = { ...verificationResult.critical };
      if (manualOverrides) {
        Object.entries(manualOverrides).forEach(([checkKey, overrideValue]) => {
          if (effectiveCriticalChecks.hasOwnProperty(checkKey)) {
            effectiveCriticalChecks[checkKey] = overrideValue;
          }
        });
      }

      const qaResults = {
        verifiedAt: verificationResult.metadata.verifiedAt,
        verifiedBy: userId || 'system',
        score: {
          critical: `${finalScore.passed}/${finalScore.total}`,
          additional: `${verificationResult.score.additionalPassed}/${verificationResult.score.additionalTotal}`,
          passed: finalScore.overallPassed
        },
        checks: {
          critical: effectiveCriticalChecks, // Use effective checks that include overrides
          additional: verificationResult.additional
        },
        qaStatus: finalScore.overallPassed ? 'passed' : 'failed_needs_fixes',
        requiresFixes: !finalScore.overallPassed,
        publishedButNeedsWork: !finalScore.overallPassed && publishedUrl,
        // Include override information for display purposes
        hasManualOverrides: manualOverrides && Object.keys(manualOverrides).length > 0,
        manualOverrides: manualOverrides || {},
        googleIndexStatus: verificationResult.metadata.googleIndexStatus,
        errors: verificationResult.metadata.errors,
        // Enhanced details for richer display
        details: {
          anchorText: {
            expected: verificationResult.metadata.anchorTextExpected,
            actual: verificationResult.metadata.anchorTextActual,
            correct: effectiveCriticalChecks.anchorTextCorrect
          },
          clientLink: {
            html: verificationResult.metadata.clientLinkHtml,
            present: effectiveCriticalChecks.clientLinkPresent,
            dofollow: effectiveCriticalChecks.linkIsDofollow
          },
          clientMention: {
            expectedPhrase: verificationResult.metadata.clientMentionExpected,
            present: effectiveCriticalChecks.clientMentionPresent,
            proximity: verificationResult.metadata.clientMentionProximity
          },
          googleIndex: {
            status: verificationResult.metadata.googleIndexStatus,
            indexed: verificationResult.additional.googleIndexed
          },
          failedChecks: Object.entries(effectiveCriticalChecks)
            .filter(([key, value]) => value === false)
            .map(([key]) => key),
          passedChecks: Object.entries(effectiveCriticalChecks)
            .filter(([key, value]) => value === true)
            .map(([key]) => key)
        }
      };
      
      const updatedMetadata = {
        ...existingMetadata,
        qaResults,
        lastVerificationAt: new Date().toISOString(),
        ...(forceDeliver && {
          manualOverride: true,
          manualOverrideAt: new Date().toISOString(),
          manualOverrideBy: userId
        })
      };
      
      // Determine new status based on effective verification results (includes manual overrides)
      let newStatus = lineItem.status;
      if (finalScore.overallPassed || forceDeliver) {
        // All critical checks passed (including overrides) OR manual override - mark as delivered
        newStatus = 'delivered';
      } else if (lineItem.status === 'in_progress') {
        // Keep as in_progress if verification failed
        // We don't want to move backwards in status
        newStatus = 'in_progress';
      }
      
      // Update the line item
      const updateData: any = {
        metadata: updatedMetadata,
        status: newStatus,
        publishedUrl: publishedUrl,
        modifiedAt: new Date()
      };
      
      // If all checks passed (including overrides) OR force delivered, set deliveredAt
      if (finalScore.overallPassed || forceDeliver) {
        updateData.deliveredAt = new Date();
      }
      
      await db
        .update(orderLineItems)
        .set(updateData)
        .where(eq(orderLineItems.id, lineItem.id));
      
      console.log(`[WorkflowLineItemSyncService] Successfully updated line item ${lineItem.id} with status ${newStatus}`);
      
      // If delivered, check if order can be completed
      if (newStatus === 'delivered') {
        await this.checkOrderCompletion(lineItem.orderId);
      }
      
      return {
        success: true,
        lineItemId: lineItem.id
      };
      
    } catch (error) {
      console.error('[WorkflowLineItemSyncService] Sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during sync'
      };
    }
  }

  /**
   * Check if all line items for an order are delivered and update order status
   */
  static async checkOrderCompletion(orderId: string): Promise<void> {
    try {
      console.log(`[WorkflowLineItemSyncService] Checking order completion for ${orderId}`);
      
      // Get all line items for this order
      const lineItems = await db
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, orderId));
      
      if (lineItems.length === 0) {
        console.log(`[WorkflowLineItemSyncService] No line items found for order ${orderId}`);
        return;
      }
      
      // Check if all are delivered or completed
      const allDelivered = lineItems.every(item => 
        item.status === 'delivered' || 
        item.status === 'completed' ||
        item.status === 'cancelled' ||
        item.status === 'refunded'
      );
      
      const activeItems = lineItems.filter(item => 
        item.status !== 'cancelled' && 
        item.status !== 'refunded'
      );
      
      const deliveredCount = activeItems.filter(item => 
        item.status === 'delivered' || 
        item.status === 'completed'
      ).length;
      
      console.log(`[WorkflowLineItemSyncService] Order ${orderId}: ${deliveredCount}/${activeItems.length} items delivered`);
      
      if (allDelivered && activeItems.length > 0 && deliveredCount === activeItems.length) {
        // All active items are delivered - order can be marked as completed
        console.log(`[WorkflowLineItemSyncService] Order ${orderId} ready for completion (${deliveredCount} items delivered)`);
        
        // Phase 3: Update order status to completed
        const { orders } = await import('@/lib/db/orderSchema');
        await db
          .update(orders)
          .set({ 
            status: 'completed',
            completedAt: new Date(),
            deliveredAt: new Date(),
            readyForDelivery: true,
            fulfillmentCompletedAt: new Date()
          })
          .where(eq(orders.id, orderId));
        
        console.log(`[WorkflowLineItemSyncService] Order ${orderId} marked as completed`);
      }
      
    } catch (error) {
      console.error('[WorkflowLineItemSyncService] Error checking order completion:', error);
    }
  }

  /**
   * Update line item when workflow step completes (for publication-verification step)
   */
  static async handlePublicationVerificationComplete(
    workflowId: string,
    stepOutputs: any,
    userId?: string,
    forceDeliver: boolean = false
  ): Promise<SyncResult> {
    try {
      console.log(`[WorkflowLineItemSyncService] Handling publication verification completion for workflow ${workflowId}`);
      
      // Extract verification results from step outputs
      const verificationResult = stepOutputs.autoVerification;
      const publishedUrl = stepOutputs.verifiedUrl || stepOutputs.publishedUrl || '';
      const effectiveScore = stepOutputs.effectiveScore; // Includes manual overrides
      const manualOverrides = stepOutputs.manualOverrides || {};
      
      if (!verificationResult) {
        return {
          success: false,
          error: 'No verification results found in step outputs'
        };
      }
      
      console.log(`[WorkflowLineItemSyncService] Using effective score:`, effectiveScore);
      console.log(`[WorkflowLineItemSyncService] Manual overrides:`, manualOverrides);
      
      // Sync to line item with effective score and manual overrides
      return await this.syncVerificationToLineItem(
        workflowId,
        verificationResult,
        publishedUrl,
        userId,
        forceDeliver,
        effectiveScore,
        manualOverrides
      );
      
    } catch (error) {
      console.error('[WorkflowLineItemSyncService] Error handling publication verification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}