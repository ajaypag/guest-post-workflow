import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/schema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and, desc } from 'drizzle-orm';

// System user ID for account-created content
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// GET - Get user's draft orders
export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all draft orders for this user
    let draftOrders: any[] = [];
    
    if (session.userType === 'internal') {
      // Internal users see drafts they created
      draftOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.createdBy, session.userId),
            eq(orders.status, 'draft')
          )
        )
        .orderBy(desc(orders.updatedAt));
    } else if (session.userType === 'account') {
      // Account users see drafts for their account
      draftOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.accountId, session.userId), // session.userId is actually accountId for account users
            eq(orders.status, 'draft')
          )
        )
        .orderBy(desc(orders.updatedAt));
    }

    return NextResponse.json({ 
      drafts: draftOrders 
    });

  } catch (error) {
    console.error('Error fetching draft orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new draft order
export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderData } = await request.json();

    // Generate a unique ID
    const orderId = crypto.randomUUID();

    // Prepare values based on user type
    const orderValues: any = {
      id: orderId,
      // Order details
      orderType: 'guest_post',
      status: 'draft',
      state: 'configuring',
      
      // Pricing defaults
      subtotalRetail: 0,
      totalRetail: 0,
      totalWholesale: 0,
      profitMargin: 0,
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Set created_by and account info based on user type
    if (session.userType === 'internal') {
      // Internal users creating drafts - they need to specify account info
      orderValues.createdBy = session.userId;
      orderValues.accountEmail = orderData.accountEmail || '';
      orderValues.accountName = orderData.accountName || '';
      orderValues.accountCompany = orderData.accountCompany || null;
      orderValues.accountId = orderData.accountId || null;
    } else if (session.userType === 'account') {
      // Account users creating their own orders
      orderValues.createdBy = SYSTEM_USER_ID; // Use system user for FK constraint
      orderValues.accountId = session.userId; // session.userId is accountId for account users
      orderValues.accountEmail = session.email || '';
      orderValues.accountName = session.name || '';
      orderValues.accountCompany = orderData.accountCompany || null;
    }
    
    // Create new draft order in a transaction
    const result = await db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(orders)
        .values(orderValues)
        .returning();

      // Create order groups if provided
      if (orderData.orderGroups && orderData.orderGroups.length > 0) {
        const orderGroupsToInsert = orderData.orderGroups.map((group: any) => ({
          orderId: newOrder.id,
          clientId: group.clientId,
          linkCount: group.linkCount,
          targetPages: group.targetPages || [],
          anchorTexts: group.anchorTexts || [],
          requirementOverrides: {},
          groupStatus: 'pending'
        }));

        await tx.insert(orderGroups).values(orderGroupsToInsert);
      }

      return newOrder;
    });

    return NextResponse.json({ 
      order: result,
      success: true 
    });

  } catch (error) {
    console.error('Error creating draft order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}