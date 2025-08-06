import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceOrderId, asTemplate } = body;

    // Get the source order with preferences
    const sourceOrder = await db.query.orders.findFirst({
      where: eq(orders.id, sourceOrderId)
    });

    if (!sourceOrder) {
      return NextResponse.json({ error: 'Source order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account' && sourceOrder.accountId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create new order with same preferences
    const newOrderId = uuidv4();
    const now = new Date();

    const newOrder = {
      id: newOrderId,
      accountId: sourceOrder.accountId,
      orderType: sourceOrder.orderType,
      status: 'draft' as const,
      state: 'configuring' as const,
      
      // Copy pricing structure (but reset to 0)
      subtotalRetail: 0,
      discountPercent: sourceOrder.discountPercent,
      discountAmount: 0,
      totalRetail: 0,
      totalWholesale: 0,
      profitMargin: 0,
      
      // Copy service options
      includesClientReview: sourceOrder.includesClientReview,
      clientReviewFee: sourceOrder.clientReviewFee,
      rushDelivery: sourceOrder.rushDelivery,
      rushFee: sourceOrder.rushFee,
      requiresClientReview: sourceOrder.requiresClientReview,
      
      // COPY ALL PREFERENCES - This is the key part!
      estimatedBudgetMin: sourceOrder.estimatedBudgetMin,
      estimatedBudgetMax: sourceOrder.estimatedBudgetMax,
      estimatedLinksCount: sourceOrder.estimatedLinksCount,
      preferencesDrMin: sourceOrder.preferencesDrMin,
      preferencesDrMax: sourceOrder.preferencesDrMax,
      preferencesTrafficMin: sourceOrder.preferencesTrafficMin,
      preferencesCategories: sourceOrder.preferencesCategories,
      preferencesTypes: sourceOrder.preferencesTypes,
      preferencesNiches: sourceOrder.preferencesNiches,
      estimatorSnapshot: sourceOrder.estimatorSnapshot,
      estimatedPricePerLink: sourceOrder.estimatedPricePerLink,
      
      // Track that this was copied
      copiedFromOrderId: sourceOrderId,
      
      // Template settings
      isTemplate: asTemplate || false,
      templateName: asTemplate ? `Template from Order #${sourceOrderId.slice(0, 8)}` : null,
      
      // Metadata
      createdBy: session.userType === 'internal' ? session.userId : sourceOrder.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(orders).values(newOrder);

    return NextResponse.json({
      success: true,
      orderId: newOrderId,
      message: asTemplate 
        ? 'Template created successfully' 
        : 'Order copied with preferences',
      preferences: {
        dr: [sourceOrder.preferencesDrMin, sourceOrder.preferencesDrMax],
        traffic: sourceOrder.preferencesTrafficMin,
        categories: sourceOrder.preferencesCategories,
        types: sourceOrder.preferencesTypes,
        estimatedBudget: [sourceOrder.estimatedBudgetMin, sourceOrder.estimatedBudgetMax]
      }
    });

  } catch (error) {
    console.error('Error copying order:', error);
    return NextResponse.json(
      { error: 'Failed to copy order' },
      { status: 500 }
    );
  }
}