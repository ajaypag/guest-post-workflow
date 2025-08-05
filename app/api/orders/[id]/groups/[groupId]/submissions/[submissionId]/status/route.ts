import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string; submissionId: string }> }
) {
  const params = await context.params;
  try {
    // Get user session
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Only internal users can update submission status' }, { status: 401 });
    }
    
    const { status, notes } = await request.json();
    
    // Validate status
    const validStatuses = ['submitted', 'in_progress', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      }, { status: 400 });
    }
    
    // Get the submission to verify it exists and belongs to the order group
    const submission = await db.query.orderSiteSubmissions.findFirst({
      where: and(
        eq(orderSiteSubmissions.id, params.submissionId),
        eq(orderSiteSubmissions.orderGroupId, params.groupId)
      )
    });
    
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    
    // Verify the order group exists and matches the order
    const orderGroup = await db.query.orderGroups.findFirst({
      where: and(
        eq(orderGroups.id, params.groupId),
        eq(orderGroups.orderId, params.id)
      )
    });
    
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }
    
    // Update submission status
    const [updatedSubmission] = await db.update(orderSiteSubmissions)
      .set({
        submissionStatus: status,
        submittedAt: status === 'submitted' ? new Date() : submission.submittedAt,
        completedAt: status === 'completed' ? new Date() : submission.completedAt,
        metadata: {
          ...submission.metadata,
          statusHistory: [
            ...(submission.metadata?.statusHistory || []),
            {
              status,
              timestamp: new Date().toISOString(),
              updatedBy: session.userId,
              notes
            }
          ]
        }
      })
      .where(eq(orderSiteSubmissions.id, params.submissionId))
      .returning();
    
    return NextResponse.json({ 
      message: 'Submission status updated successfully',
      submission: updatedSubmission
    });
    
  } catch (error) {
    console.error('Error updating submission status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}