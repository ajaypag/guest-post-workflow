import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { EnhancedOrderPricingService } from '@/lib/services/enhancedOrderPricingService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    const params = await context.params;
    const { submissionId, domainId } = await request.json();

    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the line item
    const lineItem = await db.query.orderLineItems.findFirst({
      where: and(
        eq(orderLineItems.id, params.lineItemId),
        eq(orderLineItems.orderId, params.id)
      )
    });

    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    // Check if line item already has an assignment
    if (lineItem.assignedDomainId) {
      return NextResponse.json({ 
        error: 'Line item already has an assigned domain' 
      }, { status: 400 });
    }

    // Get the domain details
    const domain = await db.query.bulkAnalysisDomains.findFirst({
      where: eq(bulkAnalysisDomains.id, domainId)
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Get the submission to extract target page and anchor text info
    const submission = await db.query.orderSiteSubmissions.findFirst({
      where: eq(orderSiteSubmissions.id, submissionId)
    });

    // Get pricing information for the domain
    let wholesalePrice = lineItem.wholesalePrice;
    let estimatedPrice = lineItem.estimatedPrice;
    let domainRating: number | null = null;
    let traffic: number | null = null;

    try {
      // Fetch the website to get pricing and metrics
      const website = await db.query.websites.findFirst({
        where: sql`${websites.domain} = ${domain.domain} 
                  OR ${websites.domain} = CONCAT('www.', ${domain.domain})
                  OR CONCAT('www.', ${websites.domain}) = ${domain.domain}`
      });

      if (website) {
        // Get DR and traffic from websites table
        domainRating = website.domainRating || null;
        traffic = website.totalTraffic || null;
        
        // Use the enhanced pricing service for pricing logic
        const pricingResult = await EnhancedOrderPricingService.getWebsitePrice(
          website.id,
          domain.domain,
          {
            quantity: 1,
            clientType: 'standard',
            urgency: 'standard'
          }
        );

        if (pricingResult.wholesalePrice > 0) {
          wholesalePrice = pricingResult.wholesalePrice;
          estimatedPrice = pricingResult.retailPrice;
        } else if (website.guestPostCost) {
          // Fallback to direct calculation if enhanced service returns 0
          wholesalePrice = Math.floor(Number(website.guestPostCost) * 100);
          estimatedPrice = wholesalePrice + 7900; // $79 service fee in cents
        }
      } else {
        // Try enhanced pricing service without website record
        const pricingResult = await EnhancedOrderPricingService.getWebsitePrice(
          null,
          domain.domain,
          {
            quantity: 1,
            clientType: 'standard',
            urgency: 'standard'
          }
        );

        if (pricingResult.wholesalePrice > 0) {
          wholesalePrice = pricingResult.wholesalePrice;
          estimatedPrice = pricingResult.retailPrice;
        }
      }
    } catch (error) {
      console.log('Could not fetch pricing data, using defaults:', error);
    }

    // Update the line item with domain assignment and pricing
    await db
      .update(orderLineItems)
      .set({
        assignedDomainId: domainId,
        assignedDomain: domain.domain,
        // Copy over target page and anchor text from submission if available
        targetPageUrl: submission?.metadata?.targetPageUrl || lineItem.targetPageUrl,
        anchorText: submission?.metadata?.anchorText || lineItem.anchorText,
        // Update pricing with calculated values
        wholesalePrice: wholesalePrice,
        estimatedPrice: estimatedPrice,
        status: 'assigned',
        assignedAt: new Date(),
        assignedBy: session.userId,
        modifiedAt: new Date(),
        modifiedBy: session.userId,
        metadata: {
          ...((lineItem.metadata as any) || {}),
          // Store metrics from websites table
          domainRating: domainRating,
          traffic: traffic,
          // Store domain qualification data
          domainQualificationStatus: domain.qualificationStatus,
          aiQualificationReasoning: domain.aiQualificationReasoning,
          notes: domain.notes
        }
      })
      .where(eq(orderLineItems.id, params.lineItemId));

    // Also update the submission to mark it as assigned
    if (submission) {
      await db
        .update(orderSiteSubmissions)
        .set({
          metadata: {
            ...submission.metadata,
            assignedToLineItemId: params.lineItemId,
            assignedAt: new Date().toISOString()
          },
          updatedAt: new Date()
        })
        .where(eq(orderSiteSubmissions.id, submissionId));
    }

    return NextResponse.json({ 
      success: true,
      message: `Domain ${domain.domain} assigned to line item`
    });

  } catch (error) {
    console.error('Error assigning domain to line item:', error);
    return NextResponse.json(
      { error: 'Failed to assign domain to line item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    const params = await context.params;

    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the line item
    const lineItem = await db.query.orderLineItems.findFirst({
      where: and(
        eq(orderLineItems.id, params.lineItemId),
        eq(orderLineItems.orderId, params.id)
      )
    });

    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    // Remove domain assignment
    await db
      .update(orderLineItems)
      .set({
        assignedDomainId: null,
        assignedDomain: null,
        status: 'pending',
        modifiedAt: new Date(),
        modifiedBy: session.userId
      })
      .where(eq(orderLineItems.id, params.lineItemId));

    // Find and update any submission that was assigned to this line item
    const submissions = await db.query.orderSiteSubmissions.findMany();
    for (const submission of submissions) {
      if (submission.metadata?.assignedToLineItemId === params.lineItemId) {
        await db
          .update(orderSiteSubmissions)
          .set({
            metadata: {
              ...submission.metadata,
              assignedToLineItemId: null,
              assignedAt: null
            },
            updatedAt: new Date()
          })
          .where(eq(orderSiteSubmissions.id, submission.id));
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Domain assignment removed from line item'
    });

  } catch (error) {
    console.error('Error removing domain assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove domain assignment' },
      { status: 500 }
    );
  }
}