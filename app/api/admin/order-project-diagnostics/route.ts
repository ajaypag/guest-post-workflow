import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { clients } from '@/lib/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only internal users
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Get order groups with client info
    const orderGroupsData = await db
      .select({
        orderGroup: orderGroups,
        client: clients
      })
      .from(orderGroups)
      .leftJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, orderId));

    // 3. Get bulk analysis projects that might be related
    // Search by order ID in tags or name
    const relatedProjects = await db
      .select()
      .from(bulkAnalysisProjects)
      .where(
        or(
          sql`${bulkAnalysisProjects.name} LIKE ${'%' + orderId.slice(0, 8) + '%'}`,
          sql`${bulkAnalysisProjects.tags}::text LIKE ${'%order-group:%'}`,
          sql`${bulkAnalysisProjects.description} LIKE ${'%' + orderId + '%'}`
        )
      );

    // 4. Check API response to see what the internal page would receive
    const apiResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/orders/${orderId}`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    let apiOrderData: any = null;
    if (apiResponse.ok) {
      apiOrderData = await apiResponse.json();
    }

    // 5. Analyze issues
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check each order group
    orderGroupsData.forEach(({ orderGroup, client }) => {
      if (!orderGroup.bulkAnalysisProjectId) {
        issues.push(`Order group ${orderGroup.id} (${client?.name || 'Unknown Client'}) has NULL bulkAnalysisProjectId`);
        
        // Check if there's a matching project that wasn't linked
        const matchingProject = relatedProjects.find(p => 
          p.clientId === orderGroup.clientId && 
          ((p.tags as string[])?.includes(`order-group:${orderGroup.id}`) || p.name.includes(orderId.slice(0, 8)))
        );
        
        if (matchingProject) {
          issues.push(`Found unlinked project "${matchingProject.name}" (${matchingProject.id}) that should be associated with order group ${orderGroup.id}`);
          recommendations.push(`Run UPDATE order_groups SET bulk_analysis_project_id = '${matchingProject.id}' WHERE id = '${orderGroup.id}'`);
        }
      } else {
        // Check if the linked project actually exists
        const linkedProject = relatedProjects.find(p => p.id === orderGroup.bulkAnalysisProjectId);
        if (!linkedProject) {
          issues.push(`Order group ${orderGroup.id} references non-existent project ${orderGroup.bulkAnalysisProjectId}`);
        }
      }
    });

    // Check order status
    if (order.status === 'draft' || order.status === 'pending_confirmation') {
      issues.push(`Order is in ${order.status} status - bulk analysis projects are only created after confirmation`);
      recommendations.push('Confirm the order first to create bulk analysis projects');
    }

    // Check API response
    if (!apiOrderData) {
      issues.push('Failed to fetch order data from API endpoint');
    } else if (!apiOrderData.orderGroups || apiOrderData.orderGroups.length === 0) {
      issues.push('API response does not include orderGroups data');
    } else {
      // Check if API response includes bulkAnalysisProjectId
      apiOrderData.orderGroups.forEach((group: any) => {
        if (!group.bulkAnalysisProjectId) {
          issues.push(`API response missing bulkAnalysisProjectId for group ${group.id}`);
        }
      });
    }

    if (issues.length === 0) {
      recommendations.push('All order groups have associated bulk analysis projects');
      recommendations.push('API is returning correct data');
      recommendations.push('Check if the internal page is properly displaying the data');
    }

    return NextResponse.json({
      orderId: order.id,
      orderStatus: order.status,
      orderState: order.state,
      orderGroups: orderGroupsData.map(({ orderGroup, client }) => ({
        id: orderGroup.id,
        clientId: orderGroup.clientId,
        clientName: client?.name || 'Unknown',
        linkCount: orderGroup.linkCount,
        bulkAnalysisProjectId: orderGroup.bulkAnalysisProjectId,
        groupStatus: orderGroup.groupStatus || 'pending'
      })),
      bulkAnalysisProjects: relatedProjects.map(p => ({
        id: p.id,
        name: p.name,
        clientId: p.clientId,
        status: p.status,
        tags: (p.tags as string[]) || []
      })),
      apiResponse: {
        orderGroups: apiOrderData?.orderGroups?.map((g: any) => ({
          id: g.id,
          bulkAnalysisProjectId: g.bulkAnalysisProjectId
        })) || []
      },
      issues,
      recommendations
    });

  } catch (error) {
    console.error('Order-project diagnostics error:', error);
    return NextResponse.json(
      { error: 'Failed to run diagnostics' },
      { status: 500 }
    );
  }
}