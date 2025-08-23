import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { workflows } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { WorkflowGenerationService } from '@/lib/services/workflowGenerationService';
import { EmailService } from '@/lib/services/emailService';
import { WorkflowsGeneratedEmail } from '@/lib/email/templates';

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
    const body = await request.json();
    
    // Extract options
    const options = {
      assignToUserId: body.assignToUserId,
      autoAssign: body.autoAssign || false,
      assignedUserId: body.assignedUserId // New: who to assign workflows to
    };

    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order is paid unless explicitly overridden
    if (!body.skipPaymentCheck && order.status !== 'paid') {
      return NextResponse.json({ 
        error: 'Order must be paid before generating workflows',
        currentStatus: order.status,
        details: 'Use skipPaymentCheck: true to override.'
      }, { status: 400 });
    }

    // Use the new line items method
    const result = await WorkflowGenerationService.generateWorkflowsForLineItems(
      orderId,
      session.userId,
      options
    );

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json({
        ...result,
        message: 'Workflow generation completed with errors'
      }, { status: 207 }); // 207 Multi-Status
    }

    // Send email notification if workflows were created successfully
    if (result.workflowsCreated > 0) {
      try {
        // Get order with account details
        const orderWithAccount = await db.query.orders.findFirst({
          where: eq(orders.id, orderId),
          with: {
            account: true
          }
        });

        if (orderWithAccount?.account?.email) {
          // Get the line items with workflow data
          const lineItemsWithWorkflows = await db.query.orderLineItems.findMany({
            where: and(
              eq(orderLineItems.orderId, orderId),
              // Only get items with workflows
              // Note: Using SQL fragment since workflowId might not be directly queryable
            ),
          });

          // Get workflow details for completion percentage
          const workflowIds = lineItemsWithWorkflows
            .filter((item): item is typeof item & { workflowId: string } => Boolean(item.workflowId))
            .map(item => item.workflowId);
          
          const workflowData = workflowIds.length > 0 
            ? await db.query.workflows.findMany({
                where: (workflow, { inArray }) => inArray(workflow.id, workflowIds),
              })
            : [];

          // Format sites for email
          const sites = lineItemsWithWorkflows
            .filter(item => item.workflowId)
            .map(item => {
              const metadata = item.metadata as any || {};
              const workflow = workflowData.find(w => w.id === item.workflowId);
              return {
                domain: item.assignedDomain || 'Domain pending',
                qualificationStatus: metadata.domainQualificationStatus,
                workflowId: item.workflowId!,
                completionPercentage: workflow?.completionPercentage ? Number(workflow.completionPercentage) : 0,
              };
            });

          // Calculate estimated completion (14 days from now)
          const estimatedDate = new Date();
          estimatedDate.setDate(estimatedDate.getDate() + 14);
          const estimatedCompletionDate = estimatedDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });

          // Send the email
          const emailResult = await EmailService.sendWithTemplate(
            'notification',
            orderWithAccount.account.email,
            {
              subject: `Production Started: ${result.workflowsCreated} Guest Posts Now in Progress`,
              template: WorkflowsGeneratedEmail({
                recipientName: orderWithAccount.account.contactName || 'there',
                companyName: orderWithAccount.account.companyName,
                orderNumber: orderId,
                workflowCount: result.workflowsCreated,
                sites,
                dashboardUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/orders/${orderId}`,
                estimatedCompletionDate,
                accountManagerName: session.name || 'Your Account Manager',
                accountManagerEmail: session.email || 'info@linkio.com',
              }),
            }
          );

          if (emailResult.success) {
            console.log(`[WORKFLOW_GENERATION] Email sent to ${orderWithAccount.account.email} for ${result.workflowsCreated} workflows`);
          } else {
            console.error('[WORKFLOW_GENERATION] Email failed:', emailResult.error);
          }
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('Failed to send workflow generation email:', emailError);
      }
    }

    return NextResponse.json({
      ...result,
      message: `Successfully generated ${result.workflowsCreated} workflows`
    });

  } catch (error) {
    console.error('Error generating workflows:', error);
    return NextResponse.json(
      { error: 'Failed to generate workflows', details: error },
      { status: 500 }
    );
  }
}