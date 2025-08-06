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
  let action: string | undefined;
  let notes: string | undefined;
  let session: any;
  
  try {
    // Get user session
    session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    action = body.action;
    notes = body.notes;
    
    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
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
    
    // Capture price snapshots when approving
    if (action === 'approve') {
      // Get website data to get actual domain rating and pricing
      const { websites } = await import('@/lib/db/websiteSchema');
      const websiteData = submission.domain?.domain ? 
        await db.query.websites.findFirst({
          where: eq(websites.domain, submission.domain.domain)
        }) : null;
      
      // Calculate price based on domain rating or use existing snapshots
      // If price snapshots already exist, use them; otherwise calculate based on DR
      let retailPrice = submission.retailPriceSnapshot;
      let wholesalePrice = submission.wholesalePriceSnapshot;
      const serviceFee = 7900; // $79 service fee
      
      if (!retailPrice) {
        // Use website's guest post cost if available, otherwise calculate based on DR
        if (websiteData?.guestPostCost) {
          // Convert from decimal dollars to cents
          wholesalePrice = Math.round(parseFloat(websiteData.guestPostCost.toString()) * 100);
          retailPrice = wholesalePrice + serviceFee;
        } else {
          // Calculate based on domain rating if available
          const dr = websiteData?.domainRating || submission.metadata?.domainRating || 50;
          
          // Pricing tiers based on DR
          if (dr >= 70) {
            retailPrice = 59900; // $599
          } else if (dr >= 50) {
            retailPrice = 49900; // $499
          } else if (dr >= 30) {
            retailPrice = 39900; // $399
          } else {
            retailPrice = 29900; // $299
          }
          
          wholesalePrice = retailPrice - serviceFee;
        }
      }
      
      updateData.retailPriceSnapshot = retailPrice;
      updateData.wholesalePriceSnapshot = wholesalePrice;
      updateData.serviceFeeSnapshot = serviceFee;
      updateData.priceSnapshotAt = new Date();
    }
    
    // If approving, get website data for metadata enrichment
    let websiteData = null;
    if (action === 'approve' && submission.domain?.domain) {
      const { websites } = await import('@/lib/db/websiteSchema');
      websiteData = await db.query.websites.findFirst({
        where: eq(websites.domain, submission.domain.domain)
      });
    }
    
    const [updatedSubmission] = await db.update(orderSiteSubmissions)
      .set({
        ...updateData,
        metadata: {
          ...(submission.metadata || {}),
          // Store domain rating and traffic when approving
          ...(action === 'approve' && websiteData ? {
            domainRating: websiteData.domainRating || submission.metadata?.domainRating,
            traffic: websiteData.totalTraffic || submission.metadata?.traffic
          } : {}),
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
    console.error('Session:', { userId: session?.userId, userType: session?.userType });
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}