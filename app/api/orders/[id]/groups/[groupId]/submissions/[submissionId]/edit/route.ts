import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { targetPages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * PATCH - Edit submission details (target page, anchor text, instructions, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string; submissionId: string }> }
) {
  try {
    const { submissionId, groupId, id: orderId } = await params;
    
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      targetPageUrl, 
      anchorText, 
      specialInstructions,
      internalNotes,
      priceOverride
    } = body;

    // Check if user is trying to edit restricted fields
    const isEditingRestrictedFields = priceOverride !== undefined || internalNotes !== undefined;
    
    // External users can only edit certain fields
    if (session.userType !== 'internal' && isEditingRestrictedFields) {
      return NextResponse.json({ 
        error: 'External users cannot edit price or internal notes' 
      }, { status: 403 });
    }

    // Use transaction for consistency
    const result = await db.transaction(async (tx) => {
      // 1. Get the submission and order group
      const submission = await tx.query.orderSiteSubmissions.findFirst({
        where: and(
          eq(orderSiteSubmissions.id, submissionId),
          eq(orderSiteSubmissions.orderGroupId, groupId)
        )
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      const orderGroup = await tx.query.orderGroups.findFirst({
        where: eq(orderGroups.id, groupId),
        with: {
          client: true,
          order: true
        }
      });

      if (!orderGroup) {
        throw new Error('Order group not found');
      }

      // Check ownership for external users
      if (session.userType === 'account') {
        // External users can only edit their own orders
        if (orderGroup.order.accountId !== session.userId) {
          throw new Error('You can only edit your own orders');
        }
      }

      // Prepare metadata updates
      const updatedMetadata = { ...(submission.metadata || {}) };
      const existingTargetPages = orderGroup.targetPages || [];
      
      // 2. Handle target page URL change
      if (targetPageUrl !== undefined && targetPageUrl !== submission.metadata?.targetPageUrl) {
        // Check if it's in the existing pool
        const isInExistingPool = existingTargetPages.some((tp: any) => tp.url === targetPageUrl);
        
        if (!isInExistingPool) {
          // Scenario 2: Adding from client's master list
          // Validate it exists in the client's target pages
          const validTargetPage = await tx.query.targetPages.findFirst({
            where: and(
              eq(targetPages.clientId, orderGroup.clientId),
              eq(targetPages.url, targetPageUrl)
            )
          });

          if (!validTargetPage) {
            throw new Error('Target URL does not exist for this client. Please add it to the client\'s target pages first.');
          }

          // Add to orderGroup's targetPages array
          const updatedTargetPages = [
            ...existingTargetPages,
            { 
              url: targetPageUrl, 
              pageId: validTargetPage.id 
            }
          ];

          await tx.update(orderGroups)
            .set({
              targetPages: updatedTargetPages,
              updatedAt: new Date()
            })
            .where(eq(orderGroups.id, groupId));

          // Target page added to order group
        }
        
        updatedMetadata.targetPageUrl = targetPageUrl;
      }

      // 3. Handle other field updates
      if (anchorText !== undefined) {
        updatedMetadata.anchorText = anchorText;
      }

      if (specialInstructions !== undefined) {
        updatedMetadata.specialInstructions = specialInstructions;
      }

      if (internalNotes !== undefined) {
        updatedMetadata.internalNotes = internalNotes;
      }

      // 4. Handle price override (if provided)
      interface UpdateData {
        metadata: typeof updatedMetadata;
        updatedAt: Date;
        retailPriceSnapshot?: number;
      }
      
      let updateData: UpdateData = {
        metadata: updatedMetadata,
        updatedAt: new Date()
      };

      if (priceOverride !== undefined) {
        // Store price override in cents (input expected in dollars)
        updateData.retailPriceSnapshot = Math.round(priceOverride * 100);
        updatedMetadata.priceOverrideReason = body.priceOverrideReason || 'Manual adjustment';
      }

      // 5. Update the submission
      const [updatedSubmission] = await tx
        .update(orderSiteSubmissions)
        .set(updateData)
        .where(eq(orderSiteSubmissions.id, submissionId))
        .returning();

      return {
        submission: updatedSubmission,
        targetPageAdded: targetPageUrl && !existingTargetPages.some((tp: any) => tp.url === targetPageUrl)
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Submission updated successfully',
      submission: result.submission,
      targetPageAdded: result.targetPageAdded
    });

  } catch (error: any) {
    console.error('Error editing submission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to edit submission' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Soft delete a submission (mark as removed)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string; submissionId: string }> }
) {
  try {
    const { submissionId, groupId } = await params;
    
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only internal users can delete submissions
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can remove submissions' }, { status: 403 });
    }

    // Get confirmation flag from query params
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    const result = await db.transaction(async (tx) => {
      // Verify submission exists
      const submission = await tx.query.orderSiteSubmissions.findFirst({
        where: and(
          eq(orderSiteSubmissions.id, submissionId),
          eq(orderSiteSubmissions.orderGroupId, groupId)
        )
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      if (hardDelete) {
        // Actually delete the record (use with caution)
        await tx.delete(orderSiteSubmissions)
          .where(eq(orderSiteSubmissions.id, submissionId));
        
        return { action: 'deleted' };
      } else {
        // Soft delete - mark as removed
        const [updatedSubmission] = await tx
          .update(orderSiteSubmissions)
          .set({
            submissionStatus: 'removed',
            metadata: {
              ...submission.metadata,
              removedAt: new Date().toISOString(),
              removedBy: session.userId,
              previousStatus: submission.submissionStatus
            },
            updatedAt: new Date()
          })
          .where(eq(orderSiteSubmissions.id, submissionId))
          .returning();
        
        return { 
          action: 'removed',
          submission: updatedSubmission 
        };
      }
    });

    return NextResponse.json({
      success: true,
      message: result.action === 'deleted' 
        ? 'Submission permanently deleted' 
        : 'Submission removed (can be restored)',
      ...result
    });

  } catch (error: any) {
    console.error('Error removing submission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove submission' },
      { status: 500 }
    );
  }
}