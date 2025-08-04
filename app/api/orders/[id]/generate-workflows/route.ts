import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/orderSchema';
import { workflows } from '@/lib/db/schema';
import { orderGroups, orderSiteSelections } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - only internal users
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can generate workflows' }, { status: 403 });
    }

    const { id: orderId } = await params;

    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order is paid
    if (order.status !== 'paid') {
      return NextResponse.json({ 
        error: 'Order must be paid before generating workflows',
        currentStatus: order.status 
      }, { status: 400 });
    }

    // Get all order groups for this order
    const groups = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, orderId),
      with: {
        client: true,
        siteSelections: {
          where: eq(orderSiteSelections.status, 'approved'),
          with: {
            domain: true
          }
        }
      }
    });

    if (!groups || groups.length === 0) {
      return NextResponse.json({ error: 'No order groups found' }, { status: 404 });
    }

    let workflowsCreated = 0;
    const createdWorkflows: Array<{
      id: string;
      title: string;
      domain: string;
      clientId: string;
    }> = [];

    // Start a transaction
    await db.transaction(async (tx) => {
      // Process each order group
      for (const group of groups) {
        // Skip if no approved sites
        if (!group.siteSelections || group.siteSelections.length === 0) {
          console.log(`Skipping group ${group.id} - no approved sites`);
          continue;
        }

        // Create workflows for each approved site
        for (const selection of group.siteSelections) {
          // For now, we'll create workflows without checking for duplicates
          // TODO: Add workflowId to orderSiteSelections table to track this

          // Create workflow
          const workflowId = uuidv4();
          const now = new Date();
          
          // Get target page info
          const targetPage = group.targetPages?.[0];
          
          const workflowTitle = `${group.client.name} - ${selection.domain}`;

          await tx.insert(workflows).values({
            id: workflowId,
            userId: session.userId,
            clientId: group.clientId,
            title: workflowTitle,
            status: 'active',
            content: {
              // Store all relevant info in the content JSON
              orderGroupId: group.id,
              domainId: selection.domainId,
              domain: selection.domain?.domain || '',
              targetPageUrl: selection.targetPageUrl || targetPage?.url,
              anchorText: selection.anchorText,
              specialInstructions: selection.internalNotes
            },
            targetPages: targetPage ? [targetPage.url] : [],
            createdAt: now,
            updatedAt: now,
          });

          // TODO: Update site selection with workflow ID once the field is added to the schema
          // For now, the workflow is created but not linked back to the selection

          createdWorkflows.push({
            id: workflowId,
            title: workflowTitle,
            domain: selection.domain?.domain || '',
            clientId: group.clientId
          });

          workflowsCreated++;
        }
      }

      // Update order status to in_progress
      if (workflowsCreated > 0) {
        await tx.update(orders)
          .set({
            status: 'in_progress',
            state: 'workflows_generated',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));
      }
    });

    console.log(`Generated ${workflowsCreated} workflows for order ${orderId}`);

    return NextResponse.json({
      success: true,
      workflowsCreated,
      workflows: createdWorkflows,
      orderId,
      message: workflowsCreated > 0 
        ? `Successfully generated ${workflowsCreated} workflows`
        : 'No workflows needed - all sites already have workflows'
    });

  } catch (error) {
    console.error('Error generating workflows:', error);
    return NextResponse.json(
      { error: 'Failed to generate workflows', details: error },
      { status: 500 }
    );
  }
}