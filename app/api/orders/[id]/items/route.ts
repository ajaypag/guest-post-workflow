import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/orderService';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Support both single and bulk add with domain mappings
    let mappings = [];
    
    if (data.domainMappings) {
      // New format with target page mappings
      mappings = data.domainMappings;
    } else if (Array.isArray(data.domainIds)) {
      // Legacy format - array of domain IDs
      mappings = data.domainIds.map((domainId: string) => ({ bulkAnalysisDomainId: domainId }));
    } else if (data.domainId) {
      // Legacy format - single domain ID
      mappings = [{ bulkAnalysisDomainId: data.domainId }];
    }

    const items = [];
    for (const mapping of mappings) {
      try {
        const item = await OrderService.addOrderItem({
          orderId: id,
          domainId: mapping.bulkAnalysisDomainId,
          targetPageId: mapping.targetPageId,
        });
        items.push(item);
      } catch (error) {
        console.error(`Failed to add domain ${mapping.bulkAnalysisDomainId}:`, error);
        // Continue with other domains
      }
    }

    // Get updated order
    const order = await OrderService.getOrderById(id);

    return NextResponse.json({ 
      items,
      order,
      added: items.length,
      failed: mappings.length - items.length,
    });
  } catch (error) {
    console.error('Error adding order items:', error);
    return NextResponse.json(
      { error: 'Failed to add order items' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID required' },
        { status: 400 }
      );
    }

    await OrderService.removeOrderItem(id, itemId);

    // Get updated order
    const order = await OrderService.getOrderById(id);

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error removing order item:', error);
    return NextResponse.json(
      { error: 'Failed to remove order item' },
      { status: 500 }
    );
  }
}