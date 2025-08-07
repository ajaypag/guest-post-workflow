import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

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

    // Update the line item with domain assignment
    await db
      .update(orderLineItems)
      .set({
        assignedDomainId: domainId,
        assignedDomain: domain.domain,
        // Copy over target page and anchor text from submission if available
        targetPageUrl: submission?.metadata?.targetPageUrl || lineItem.targetPageUrl,
        anchorText: submission?.metadata?.anchorText || lineItem.anchorText,
        status: 'assigned',
        updatedAt: new Date()
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
        updatedAt: new Date()
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