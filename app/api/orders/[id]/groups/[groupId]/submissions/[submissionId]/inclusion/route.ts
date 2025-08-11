import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * PATCH - Update submission inclusion status (included/excluded/saved_for_later)
 * This is the new status-based system replacing pools
 */
export async function PATCH(
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

    const body = await request.json();
    const { 
      inclusionStatus, 
      inclusionOrder,
      exclusionReason 
    } = body;

    // Validate inclusion status
    if (inclusionStatus && !['included', 'excluded', 'saved_for_later'].includes(inclusionStatus)) {
      return NextResponse.json({ 
        error: 'Invalid inclusion status. Must be: included, excluded, or saved_for_later' 
      }, { status: 400 });
    }

    // External users can change inclusion status but not set internal exclusion reasons
    // (They can exclude sites, just not add internal notes about why)

    const result = await db.transaction(async (tx) => {
      // Get the submission
      const submission = await tx.query.orderSiteSubmissions.findFirst({
        where: and(
          eq(orderSiteSubmissions.id, submissionId),
          eq(orderSiteSubmissions.orderGroupId, groupId)
        )
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Get order group to check ownership
      const orderGroup = await tx.query.orderGroups.findFirst({
        where: eq(orderGroups.id, groupId),
        with: {
          order: true
        }
      });

      if (!orderGroup) {
        throw new Error('Order group not found');
      }

      // Check ownership for external users
      if (session.userType === 'account') {
        if (orderGroup.order.accountId !== session.userId) {
          throw new Error('You can only modify your own orders');
        }
      }

      // Prepare update data
      interface UpdateData {
        inclusionStatus?: string;
        inclusionOrder?: number;
        exclusionReason?: string | null;
        updatedAt: Date;
        // Also update pool fields for backward compatibility
        selectionPool?: string;
        poolRank?: number;
      }

      const updateData: UpdateData = {
        updatedAt: new Date()
      };

      if (inclusionStatus !== undefined) {
        updateData.inclusionStatus = inclusionStatus;
        
        // Map to pool for backward compatibility
        if (inclusionStatus === 'included') {
          updateData.selectionPool = 'primary';
        } else {
          updateData.selectionPool = 'alternative';
        }
      }

      if (inclusionOrder !== undefined) {
        updateData.inclusionOrder = inclusionOrder;
        updateData.poolRank = inclusionOrder; // Keep pool rank in sync
      }

      if (exclusionReason !== undefined) {
        // Only internal users can set exclusion reasons (internal notes)
        if (session.userType === 'internal') {
          updateData.exclusionReason = inclusionStatus === 'excluded' ? exclusionReason : null;
        }
      }

      // Update the submission
      const [updatedSubmission] = await tx
        .update(orderSiteSubmissions)
        .set(updateData)
        .where(eq(orderSiteSubmissions.id, submissionId))
        .returning();

      return updatedSubmission;
    });

    return NextResponse.json({
      success: true,
      message: 'Inclusion status updated successfully',
      submission: {
        id: result.id,
        inclusionStatus: result.inclusionStatus,
        inclusionOrder: result.inclusionOrder,
        exclusionReason: result.exclusionReason
      }
    });

  } catch (error: any) {
    console.error('Error updating inclusion status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update inclusion status' },
      { status: 500 }
    );
  }
}