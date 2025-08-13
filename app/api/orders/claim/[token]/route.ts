import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { eq } from 'drizzle-orm';
import { claimViewRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';

// GET - Get order details by share token (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Rate limiting by IP to prevent abuse
    const clientIp = getClientIp(request);
    const rateLimitResult = claimViewRateLimiter.check(`view:${clientIp}`);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.` 
      }, { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 300)
        }
      });
    }

    // Find order by share token
    const order = await db.query.orders.findFirst({
      where: eq(orders.shareToken, token),
      with: {
        account: {
          columns: {
            companyName: true,
            contactName: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // Check if token is expired
    if (order.shareExpiresAt && new Date(order.shareExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    // Get order groups with client info
    const orderGroupsData = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, order.id),
      with: {
        client: {
          columns: {
            id: true,
            name: true,
            website: true,
            description: true
          }
        }
      }
    });
    
    // Get site submissions for each order group to show analysis data
    const siteSubmissions: Record<string, any[]> = {};
    
    for (const orderGroup of orderGroupsData) {
      const submissions = await db.query.orderSiteSubmissions.findMany({
        where: eq(orderSiteSubmissions.orderGroupId, orderGroup.id),
        orderBy: (submissions, { desc }) => [desc(submissions.submittedAt)]
      });
      
      // Format submissions for OrderSiteReviewTableV2
      const formattedSubmissions = submissions.map(submission => ({
        id: submission.id,
        domainId: submission.domainId,
        domain: submission.metadata?.domain || '',
        url: submission.metadata?.url || '',
        dr: submission.metadata?.dr || 0,
        traffic: submission.metadata?.traffic || 0,
        categories: submission.metadata?.categories || [],
        qualificationReasoning: submission.metadata?.qualificationReasoning || '',
        wholesalePrice: submission.wholesalePriceSnapshot || 0,
        retailPrice: submission.retailPriceSnapshot || 0,
        targetPageUrl: submission.metadata?.targetPageUrl || '',
        anchorText: submission.metadata?.anchorText || '',
        specialInstructions: submission.metadata?.specialInstructions || '',
        submissionStatus: submission.submissionStatus,
        inclusionStatus: submission.inclusionStatus,
        exclusionReason: submission.exclusionReason,
        submittedAt: submission.submittedAt,
        // Add analysis fields that OrderSiteReviewTableV2 expects
        topicScopeAnalysis: submission.metadata?.topicScopeAnalysis || '',
        qualityScore: submission.metadata?.qualityScore || 0,
        notes: submission.metadata?.notes || ''
      }));
      
      siteSubmissions[orderGroup.id] = formattedSubmissions;
    }

    // Format response with rich analysis data for OrderSiteReviewTableV2
    const publicOrder = {
      id: order.id,
      status: order.status,
      state: order.state,
      totalPrice: order.totalRetail,
      totalWholesale: order.totalWholesale,
      includesClientReview: order.includesClientReview,
      rushDelivery: order.rushDelivery,
      shareExpiresAt: order.shareExpiresAt,
      account: order.account ? {
        companyName: order.account.companyName,
        contactName: order.account.contactName
      } : null,
      orderGroups: orderGroupsData.map(orderGroup => ({
        id: orderGroup.id,
        clientId: orderGroup.clientId,
        linkCount: orderGroup.linkCount,
        targetPages: orderGroup.targetPages,
        client: orderGroup.client ? {
          id: orderGroup.client.id,
          name: orderGroup.client.name,
          website: orderGroup.client.website
        } : null
      }))
    };

    return NextResponse.json({ 
      success: true,
      order: publicOrder,
      siteSubmissions
    });

  } catch (error: any) {
    console.error('Error fetching order by token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load order' },
      { status: 500 }
    );
  }
}