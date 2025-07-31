import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { WorkflowGenerationService } from '@/lib/services/workflowGenerationService';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: orderId } = await params;
    const body = await request.json();
    
    // Extract options
    const options = {
      assignToUserId: body.assignToUserId,
      autoAssign: body.autoAssign || false
    };

    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check payment status unless explicitly overridden
    if (!body.skipPaymentCheck && !order.paidAt) {
      return NextResponse.json({ 
        error: 'Order has not been paid yet', 
        details: 'Workflows can only be generated after payment is confirmed. Use skipPaymentCheck: true to override.'
      }, { status: 400 });
    }

    // Generate workflows for all approved sites
    const result = await WorkflowGenerationService.generateWorkflowsForOrder(
      orderId,
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