import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { action } = body; // 'generate_invoice' or 'mark_paid'

    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account') {
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Account users can only view invoices, not mark as paid
      if (action === 'mark_paid') {
        return NextResponse.json({ error: 'Only internal users can mark orders as paid' }, { status: 403 });
      }
    }

    if (action === 'generate_invoice') {
      // Get order groups and submissions separately
      const orderGroupsList = await db.query.orderGroups.findMany({
        where: eq(orderGroups.orderId, orderId)
      });

      const allSubmissions = [];
      for (const group of orderGroupsList) {
        const submissions = await db.query.orderSiteSubmissions.findMany({
          where: eq(orderSiteSubmissions.orderGroupId, group.id)
        });
        allSubmissions.push(...submissions);
      }

      // Check if all sites have been reviewed
      const pendingSubmissions = allSubmissions.filter(s => 
        s.submissionStatus === 'pending' || s.submissionStatus === 'submitted'
      );
      
      if (pendingSubmissions.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot generate invoice - site review not complete',
          pendingCount: pendingSubmissions.length 
        }, { status: 400 });
      }

      const approvedSubmissions = allSubmissions.filter(s => 
        s.submissionStatus === 'client_approved'
      );

      if (approvedSubmissions.length === 0) {
        return NextResponse.json({ 
          error: 'Cannot generate invoice - no approved sites' 
        }, { status: 400 });
      }

      // Update order to payment_pending state (still confirmed status)
      const updatedOrder = await db.update(orders)
        .set({
          state: 'payment_pending',
          invoicedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      return NextResponse.json({
        success: true,
        order: updatedOrder[0],
        message: 'Invoice generated successfully',
        approvedSites: approvedSubmissions.length
      });

    } else if (action === 'mark_paid') {
      // Only internal users can mark as paid
      if (session.userType !== 'internal') {
        return NextResponse.json({ error: 'Only internal users can mark orders as paid' }, { status: 403 });
      }

      // Check if order is invoiced
      if (!order.invoicedAt) {
        return NextResponse.json({ 
          error: 'Cannot mark as paid - invoice not generated yet' 
        }, { status: 400 });
      }

      // Update order to paid status with payment_received state
      const updatedOrder = await db.update(orders)
        .set({
          status: 'paid',
          state: 'payment_received',
          paidAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      return NextResponse.json({
        success: true,
        order: updatedOrder[0],
        message: 'Order marked as paid successfully'
      });

    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "generate_invoice" or "mark_paid"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing invoice action:', error);
    return NextResponse.json(
      { error: 'Failed to process invoice action', details: error },
      { status: 500 }
    );
  }
}