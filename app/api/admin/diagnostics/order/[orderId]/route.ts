import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders, orderGroups, clients, targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    
    // Get the order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
      
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Get order groups with client info
    const orderGroupsData = await db
      .select({
        id: orderGroups.id,
        orderId: orderGroups.orderId,
        clientId: orderGroups.clientId,
        linkCount: orderGroups.linkCount,
        targetPages: orderGroups.targetPages,
        anchorTexts: orderGroups.anchorTexts,
        requirementOverrides: orderGroups.requirementOverrides,
        groupStatus: orderGroups.groupStatus,
        bulkAnalysisProjectId: orderGroups.bulkAnalysisProjectId,
        client: {
          id: clients.id,
          name: clients.name,
          website: clients.website,
          niche: clients.niche
        }
      })
      .from(orderGroups)
      .leftJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, orderId));
    
    // Get order items if any
    const { orderItems } = await import('@/lib/db/orderItemSchema');
    const orderItemsData = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    
    return NextResponse.json({
      order,
      orderGroups: orderGroupsData,
      orderItems: orderItemsData,
      diagnostics: {
        hasOrderGroups: orderGroupsData.length > 0,
        totalTargetPages: orderGroupsData.reduce((sum, g) => 
          sum + (Array.isArray(g.targetPages) ? g.targetPages.length : 0), 0
        ),
        groupsWithoutTargetPages: orderGroupsData.filter(g => 
          !g.targetPages || (Array.isArray(g.targetPages) && g.targetPages.length === 0)
        ).length
      }
    });
    
  } catch (error) {
    console.error('Error in order diagnostics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch order diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}