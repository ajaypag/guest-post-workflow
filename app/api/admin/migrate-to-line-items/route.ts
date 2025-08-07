import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderLineItems, lineItemChanges } from '@/lib/db/orderLineItemSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * Migration endpoint to convert orderGroups + submissions to line items
 * 
 * Strategy:
 * 1. For each orderGroup, create N line items (based on linkCount)
 * 2. Map existing submissions to line items
 * 3. Preserve all pricing, status, and metadata
 * 4. Create change log entries for audit trail
 */

export async function POST(request: NextRequest) {
  try {
    // Check auth - must be internal admin
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Only admin users can run migrations' 
      }, { status: 403 });
    }

    const { orderId, dryRun = true } = await request.json();

    if (!orderId) {
      return NextResponse.json({ 
        error: 'orderId is required' 
      }, { status: 400 });
    }

    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Check if already migrated
    const existingLineItems = await db.query.orderLineItems.findMany({
      where: eq(orderLineItems.orderId, orderId)
    });

    if (existingLineItems.length > 0 && !dryRun) {
      return NextResponse.json({ 
        error: 'Order already has line items. Migration may have already been done.' 
      }, { status: 400 });
    }

    // Get order groups
    const groups = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, orderId),
      with: {
        client: true
      }
    });

    // Get all submissions
    const allSubmissions = [];
    for (const group of groups) {
      const submissions = await db.query.orderSiteSubmissions.findMany({
        where: eq(orderSiteSubmissions.orderGroupId, group.id),
        with: {
          domain: true
        }
      });
      allSubmissions.push(...submissions.map(s => ({ ...s, groupId: group.id })));
    }

    // Plan the migration
    const migrationPlan = {
      orderId,
      totalGroups: groups.length,
      totalSubmissions: allSubmissions.length,
      lineItemsToCreate: [] as any[],
      changesToLog: [] as any[]
    };

    let displayOrder = 0;

    // Create line items for each group
    for (const group of groups) {
      const groupSubmissions = allSubmissions.filter(s => s.groupId === group.id);
      
      // Sort submissions by status priority
      const sortedSubmissions = groupSubmissions.sort((a, b) => {
        const statusPriority: Record<string, number> = {
          'client_approved': 1,
          'completed': 2,
          'in_progress': 3,
          'submitted': 4,
          'pending': 5,
          'client_rejected': 6,
          'rejected': 7
        };
        const aPriority = statusPriority[a.submissionStatus] ?? 99;
        const bPriority = statusPriority[b.submissionStatus] ?? 99;
        return aPriority - bPriority;
      });

      // Create line items up to linkCount
      for (let i = 0; i < group.linkCount; i++) {
        const submission = sortedSubmissions[i];
        
        const lineItem = {
          orderId,
          clientId: group.clientId,
          
          // If we have a submission, use its data
          ...(submission ? {
            targetPageUrl: submission.metadata?.targetPageUrl || group.targetPages?.[0]?.url,
            anchorText: submission.metadata?.anchorText || group.anchorTexts?.[0],
            
            // Status mapping
            status: mapSubmissionStatusToLineItemStatus(submission.submissionStatus),
            clientReviewStatus: mapClientReviewStatus(submission.submissionStatus),
            
            // Site assignment
            assignedDomainId: submission.domainId,
            assignedDomain: submission.domain?.domain,
            assignedAt: submission.createdAt,
            assignedBy: session.userId,
            
            // Pricing
            estimatedPrice: submission.retailPriceSnapshot || submission.metadata?.estimatedPrice,
            approvedPrice: submission.submissionStatus === 'client_approved' ? submission.retailPriceSnapshot : null,
            wholesalePrice: submission.wholesalePriceSnapshot,
            serviceFee: submission.serviceFeeSnapshot || 7900,
            
            // Client review
            clientReviewedAt: submission.clientReviewedAt,
            clientReviewNotes: submission.clientReviewNotes,
            
            // Delivery
            workflowId: submission.metadata?.workflowId,
            draftUrl: submission.metadata?.draftUrl,
            publishedUrl: submission.metadata?.publishedUrl,
            deliveredAt: submission.completedAt,
            
            // Metadata
            metadata: {
              originalGroupId: group.id,
              originalSubmissionId: submission.id,
              bulkAnalysisProjectId: group.bulkAnalysisProjectId,
              ...submission.metadata
            }
          } : {
            // No submission yet, create placeholder
            targetPageUrl: group.targetPages?.[i]?.url || group.targetPages?.[0]?.url,
            targetPageId: group.targetPages?.[i]?.pageId,
            anchorText: group.anchorTexts?.[i] || group.anchorTexts?.[0],
            status: 'draft',
            estimatedPrice: calculateEstimatedPrice(group),
            metadata: {
              originalGroupId: group.id,
              bulkAnalysisProjectId: group.bulkAnalysisProjectId
            }
          }),
          
          addedAt: group.createdAt || new Date(),
          addedBy: session.userId,
          displayOrder: displayOrder++,
          version: 1
        };

        migrationPlan.lineItemsToCreate.push(lineItem);

        // Create change log entry
        migrationPlan.changesToLog.push({
          lineItemId: null, // Will be set after creation
          orderId,
          changeType: 'created',
          newValue: { 
            source: 'migration',
            originalGroupId: group.id,
            originalSubmissionId: submission?.id
          },
          changedBy: session.userId,
          changeReason: 'Migrated from orderGroups model'
        });
      }

      // Handle extra submissions (beyond linkCount)
      if (sortedSubmissions.length > group.linkCount) {
        for (let i = group.linkCount; i < sortedSubmissions.length; i++) {
          const submission = sortedSubmissions[i];
          
          // Create additional line items for extra submissions
          const extraLineItem = {
            orderId,
            clientId: group.clientId,
            targetPageUrl: submission.metadata?.targetPageUrl,
            anchorText: submission.metadata?.anchorText,
            status: mapSubmissionStatusToLineItemStatus(submission.submissionStatus),
            clientReviewStatus: mapClientReviewStatus(submission.submissionStatus),
            assignedDomainId: submission.domainId,
            assignedDomain: submission.domain?.domain,
            assignedAt: submission.createdAt,
            assignedBy: session.userId,
            approvedPrice: submission.submissionStatus === 'client_approved' ? submission.retailPriceSnapshot : null,
            wholesalePrice: submission.wholesalePriceSnapshot,
            serviceFee: submission.serviceFeeSnapshot || 7900,
            clientReviewedAt: submission.clientReviewedAt,
            clientReviewNotes: submission.clientReviewNotes,
            metadata: {
              originalGroupId: group.id,
              originalSubmissionId: submission.id,
              extraSubmission: true,
              note: 'Created from submission beyond original linkCount'
            },
            addedAt: submission.createdAt,
            addedBy: session.userId,
            displayOrder: displayOrder++,
            version: 1
          };

          migrationPlan.lineItemsToCreate.push(extraLineItem);
        }
      }
    }

    // If dry run, just return the plan
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        migrationPlan: {
          ...migrationPlan,
          lineItemsToCreate: migrationPlan.lineItemsToCreate.length,
          summary: {
            totalLineItems: migrationPlan.lineItemsToCreate.length,
            byStatus: migrationPlan.lineItemsToCreate.reduce((acc: Record<string, number>, item) => {
              acc[item.status] = (acc[item.status] || 0) + 1;
              return acc;
            }, {}),
            byClient: migrationPlan.lineItemsToCreate.reduce((acc: Record<string, number>, item) => {
              const client = groups.find(g => g.clientId === item.clientId)?.client?.name || 'Unknown';
              acc[client] = (acc[client] || 0) + 1;
              return acc;
            }, {})
          }
        }
      });
    }

    // Execute the migration
    const createdLineItems = await db.transaction(async (tx) => {
      // Create all line items
      const created = await tx.insert(orderLineItems)
        .values(migrationPlan.lineItemsToCreate)
        .returning();

      // Create change log entries
      const changes = migrationPlan.changesToLog.map((change, index) => ({
        ...change,
        lineItemId: created[index].id,
        batchId: orderId // Use orderId as batch ID for migration
      }));

      await tx.insert(lineItemChanges).values(changes);

      // Update order to mark as migrated (using internalNotes for now)
      const migrationNote = `[MIGRATED TO LINE ITEMS] ${new Date().toISOString()} by ${session.userId}`;
      await tx.update(orders)
        .set({
          internalNotes: order.internalNotes 
            ? `${order.internalNotes}\n${migrationNote}`
            : migrationNote,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      return created;
    });

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      stats: {
        lineItemsCreated: createdLineItems.length,
        byStatus: createdLineItems.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

// Helper functions
function mapSubmissionStatusToLineItemStatus(submissionStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'selected',
    'submitted': 'in_progress',
    'approved': 'in_progress',
    'rejected': 'cancelled',
    'client_approved': 'approved',
    'client_rejected': 'cancelled',
    'completed': 'delivered',
    'in_progress': 'in_progress'
  };
  return statusMap[submissionStatus] || 'draft';
}

function mapClientReviewStatus(submissionStatus: string): string | null {
  if (submissionStatus === 'client_approved') return 'approved';
  if (submissionStatus === 'client_rejected') return 'rejected';
  if (submissionStatus === 'pending') return 'pending';
  return null;
}

function calculateEstimatedPrice(group: any): number {
  // Simple estimation based on package or default
  if (group.packagePrice) {
    return Math.round(group.packagePrice / group.linkCount);
  }
  return 49900; // Default $499
}