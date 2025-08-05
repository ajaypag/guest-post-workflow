import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string; submissionId: string }> }
) {
  const params = await context.params;
  try {
    // Get user session
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { action, notes } = await request.json();
    
    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be either "approve" or "reject"' 
      }, { status: 400 });
    }
    
    // Get the order to check permissions
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, params.id)
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check permissions
    if (session.userType === 'account') {
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
      }
    }
    
    // Get the submission to verify it exists and belongs to the order group
    const submission = await db.query.orderSiteSubmissions.findFirst({
      where: and(
        eq(orderSiteSubmissions.id, params.submissionId),
        eq(orderSiteSubmissions.orderGroupId, params.groupId)
      ),
      with: {
        domain: true
      }
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
    
    // Update submission with client review
    const newStatus = action === 'approve' ? 'client_approved' : 'client_rejected';
    
    const updateData: any = {
      submissionStatus: newStatus,
      clientReviewedAt: new Date(),
      clientReviewNotes: notes,
    };
    
    // Only set clientReviewedBy for internal users (references users table)
    if (session.userType === 'internal') {
      updateData.clientReviewedBy = session.userId;
    }
    
    const [updatedSubmission] = await db.update(orderSiteSubmissions)
      .set({
        ...updateData,
        metadata: {
          ...(submission.metadata || {}),
          reviewHistory: [
            ...(submission.metadata?.reviewHistory || []),
            {
              action,
              timestamp: new Date().toISOString(),
              reviewedBy: session.userId,
              reviewerType: session.userType as 'internal' | 'account',
              notes
            }
          ]
        }
      })
      .where(eq(orderSiteSubmissions.id, params.submissionId))
      .returning();
    
    return NextResponse.json({ 
      message: `Submission ${action}d successfully`,
      submission: updatedSubmission
    });
    
  } catch (error) {
    console.error('Error reviewing submission:', error);
    console.error('Request params:', params);
    console.error('Request body:', { action, notes });
    console.error('Session:', { userId: session.userId, userType: session.userType });
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}