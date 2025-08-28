import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { OrderService } from '@/lib/services/orderService';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { deadline, cascadeToLineItems = false } = await request.json();

    // Validate inputs
    if (!deadline) {
      return NextResponse.json(
        { error: 'Deadline is required' },
        { status: 400 }
      );
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid deadline date' },
        { status: 400 }
      );
    }

    // Update the order deadline
    await OrderService.updateOrderDeadline(
      params.id,
      deadlineDate,
      cascadeToLineItems,
      session.userId
    );

    return NextResponse.json({ 
      success: true,
      message: cascadeToLineItems 
        ? 'Order deadline updated and cascaded to line items'
        : 'Order deadline updated'
    });

  } catch (error) {
    console.error('Error updating order deadline:', error);
    return NextResponse.json(
      { error: 'Failed to update deadline' },
      { status: 500 }
    );
  }
}