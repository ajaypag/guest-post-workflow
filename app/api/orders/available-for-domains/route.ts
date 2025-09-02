import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { clients } from '@/lib/db/schema';
import { eq, and, inArray, count, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const domainIds = searchParams.get('domainIds')?.split(',') || [];

    // If domainIds are provided, get their client IDs to filter orders
    let allowedClientIds: string[] = [];
    
    if (domainIds.length > 0) {
      const domains = await db
        .select({
          clientId: bulkAnalysisDomains.clientId,
        })
        .from(bulkAnalysisDomains)
        .where(inArray(bulkAnalysisDomains.id, domainIds));
      
      console.log('[DEBUG] Domain IDs requested:', domainIds);
      console.log('[DEBUG] Domains found:', domains);
      
      allowedClientIds = [...new Set(domains.map(d => d.clientId).filter(Boolean))];
      console.log('[DEBUG] Allowed client IDs:', allowedClientIds);
    } else if (clientId) {
      allowedClientIds = [clientId];
    }

    // Build order query conditions
    // Match the same editable statuses from the order edit functionality
    // Orders are editable until payment is ACTUALLY received (not just invoiced)
    const editableStatuses = [
      'draft',                  // Creating order
      'pending_confirmation',   // Submitted but not confirmed
      'confirmed',             // Internal confirmed, analyzing
      'sites_ready',           // Sites selected for review
      'client_reviewing',      // Client reviewing sites
      'client_approved',       // Client approved sites
      'invoiced'               // Invoice sent but not paid - user can still edit
    ];
    
    let whereConditions = [
      // Orders can accept new domains until payment is received
      inArray(orders.status, editableStatuses)
    ];

    // For internal users, we want to show:
    // 1. Orders that already have line items from these clients (for consistency)
    // 2. ALL orders from the same account (since orders can have multiple clients)
    
    if (allowedClientIds.length > 0 && session.userType === 'internal') {
      // Get the account associated with these clients
      const clientsData = await db
        .select({
          accountId: clients.accountId
        })
        .from(clients)
        .where(inArray(clients.id, allowedClientIds));
      
      const accountIds = [...new Set(clientsData.map(c => c.accountId).filter(Boolean))] as string[];
      console.log('[DEBUG] Account IDs from clients:', accountIds);
      
      if (accountIds.length > 0) {
        // Show ALL orders from these accounts (not just orders with matching clients)
        // This allows adding domains to any order from the same account
        whereConditions.push(inArray(orders.accountId, accountIds));
        console.log('[DEBUG] Showing all orders from accounts:', accountIds);
      } else {
        // No account found, fall back to client-based filtering
        const ordersWithMatchingClients = await db
          .selectDistinct({
            orderId: orderLineItems.orderId
          })
          .from(orderLineItems)
          .where(inArray(orderLineItems.clientId, allowedClientIds));
        
        console.log('[DEBUG] Orders with matching clients:', ordersWithMatchingClients);
        
        const orderIds = ordersWithMatchingClients.map(o => o.orderId);
        
        if (orderIds.length > 0) {
          whereConditions.push(inArray(orders.id, orderIds));
        } else {
          console.log('[DEBUG] No orders found with line items from client IDs:', allowedClientIds);
          return NextResponse.json({ orders: [] });
        }
      }
    } else if (allowedClientIds.length > 0) {
      // For account users, also show ALL orders from their account
      // (not just orders with the specific client, since orders can have multiple clients)
      if (session.userType === 'account') {
        // Account users see all their orders, regardless of client
        // The account filtering is already handled below in the user permission section
        console.log('[DEBUG] Account user - will show all orders from their account');
      } else {
        // Other non-internal users might need strict client filtering
        const ordersWithMatchingClients = await db
          .selectDistinct({
            orderId: orderLineItems.orderId
          })
          .from(orderLineItems)
          .where(inArray(orderLineItems.clientId, allowedClientIds));
        
        const orderIds = ordersWithMatchingClients.map(o => o.orderId);
        
        if (orderIds.length > 0) {
          whereConditions.push(inArray(orders.id, orderIds));
        } else {
          return NextResponse.json({ orders: [] });
        }
      }
    } else {
      // If no client filtering
      console.log('[DEBUG] No client IDs to filter by');
      if (session.userType === 'account') {
        // Account users can still see all their own orders
        console.log('[DEBUG] Account user - will show all orders from their account');
      } else if (session.userType === 'internal') {
        // Internal users can see all editable orders when no specific client is selected
        console.log('[DEBUG] Internal user - showing all editable orders');
      } else {
        // Other user types need client filtering
        console.log('[DEBUG] Other user type with no client filtering - returning empty');
        return NextResponse.json({ orders: [] });
      }
    }

    // Add user permission filtering
    if (session.userType === 'account') {
      // Account users can only see their own orders
      const accountId = session.accountId || session.userId;
      whereConditions.push(eq(orders.accountId, accountId));
    }
    // Internal users can see all orders (no additional filtering needed)

    // Fetch available orders with item counts
    console.log('[DEBUG] Final where conditions count:', whereConditions.length);
    console.log('[DEBUG] Fetching orders with editable statuses:', editableStatuses);
    
    const availableOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        state: orders.state,
        orderType: orders.orderType,
        totalRetail: orders.totalRetail,
        discountPercent: orders.discountPercent,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(...whereConditions))
      .orderBy(desc(orders.updatedAt));
    
    console.log('[DEBUG] Available orders found:', availableOrders.length);

    // Get line item details for each order
    const orderIds = availableOrders.map(o => o.id);
    const orderDetails = orderIds.length > 0 ? await db
      .select({
        orderId: orderLineItems.orderId,
        clientId: orderLineItems.clientId,
        clientName: clients.name,
        assignedDomain: orderLineItems.assignedDomain,
        targetPageUrl: orderLineItems.targetPageUrl,
        status: orderLineItems.status,
      })
      .from(orderLineItems)
      .leftJoin(clients, eq(orderLineItems.clientId, clients.id))
      .where(inArray(orderLineItems.orderId, orderIds)) : [];

    // Group by order ID and calculate stats
    const orderStatsMap = new Map();
    for (const detail of orderDetails) {
      if (!detail?.orderId) continue; // Skip invalid details
      
      if (!orderStatsMap.has(detail.orderId)) {
        orderStatsMap.set(detail.orderId, {
          itemCount: 0,
          clients: new Set(),
          domains: [],
          targetUrls: new Set(),
        });
      }
      
      const stats = orderStatsMap.get(detail.orderId);
      if (stats) {
        stats.itemCount++;
        if (detail.clientName) stats.clients.add(detail.clientName);
        if (detail.assignedDomain) stats.domains.push(detail.assignedDomain);
        if (detail.targetPageUrl) stats.targetUrls.add(detail.targetPageUrl);
      }
    }

    // Combine orders with enhanced details
    const ordersWithCounts = availableOrders.map(order => {
      const stats = orderStatsMap.get(order.id) || { itemCount: 0, clients: new Set(), domains: [], targetUrls: new Set() };
      const clientsSet = stats.clients || new Set();
      const clientNames = Array.from(clientsSet).filter(Boolean);
      const domains = Array.isArray(stats.domains) ? stats.domains.filter(Boolean) : [];
      const sampleDomains = domains.slice(0, 3); // Show first 3 domains
      const targetUrls = stats.targetUrls || new Set();
      
      return {
        ...order,
        itemCount: stats.itemCount || 0,
        clientNames: clientNames,
        clientsText: clientNames.length > 0 ? clientNames.join(', ') : 'No clients',
        sampleDomains: sampleDomains,
        domainsText: sampleDomains.length > 0 
          ? sampleDomains.join(', ') + (domains.length > 3 ? ` +${domains.length - 3} more` : '')
          : 'No domains assigned',
        targetCount: targetUrls.size || 0,
        displayName: `Order ${order.id?.slice(-8) || 'Unknown'} (${stats.itemCount || 0} items)`,
        formattedTotal: `$${((order.totalRetail || 0) / 100).toFixed(2)}`,
        createdAtFormatted: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown',
        purpose: clientNames.length > 0 
          ? `${clientNames[0]}${clientNames.length > 1 ? ` +${clientNames.length - 1} more` : ''} campaign`
          : 'Mixed campaign',
      };
    });

    return NextResponse.json({
      orders: ordersWithCounts,
      total: ordersWithCounts.length,
    });

  } catch (error: any) {
    console.error('Error fetching available orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available orders', details: error.message },
      { status: 500 }
    );
  }
}