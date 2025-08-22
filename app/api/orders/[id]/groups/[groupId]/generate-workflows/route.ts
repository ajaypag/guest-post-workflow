import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { WorkflowGenerationService } from '@/lib/services/workflowGenerationService';
import { db } from '@/lib/db/connection';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    // Check authentication - only internal users can generate workflows
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can generate workflows' }, { status: 403 });
    }

    const { id: orderId, groupId } = await params;
    const body = await request.json();
    
    // Extract options
    const options = {
      assignToUserId: body.assignToUserId,
      autoAssign: body.autoAssign || false,
      assignedUserId: body.assignedUserId // New: who to assign workflows to
    };

    // Verify order group exists
    const orderGroup = await db.query.orderGroups.findFirst({
      where: eq(orderGroups.id, groupId),
      with: {
        order: true
      }
    });

    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    if (orderGroup.order.id !== orderId) {
      return NextResponse.json({ error: 'Order group does not belong to this order' }, { status: 400 });
    }

    // Check payment status unless explicitly overridden
    if (!body.skipPaymentCheck && !orderGroup.order.paidAt) {
      return NextResponse.json({ 
        error: 'Order has not been paid yet', 
        details: 'Workflows can only be generated after payment is confirmed. Use skipPaymentCheck: true to override.'
      }, { status: 400 });
    }

    // Generate workflows for this specific order group
    const result = await WorkflowGenerationService.generateWorkflowsForOrderGroup(
      groupId,
      session.userId,
      options
    );

    if (!result.success) {
      return NextResponse.json({
        ...result,
        message: 'Workflow generation completed with errors'
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({
      ...result,
      message: `Successfully generated ${result.workflowsCreated} workflows`
    });

  } catch (error) {
    console.error('Error in workflow generation endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to generate workflows', details: error },
      { status: 500 }
    );
  }
}