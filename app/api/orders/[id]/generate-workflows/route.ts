import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { WorkflowGenerationService } from '@/lib/services/workflowGenerationService';

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