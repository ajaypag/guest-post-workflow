import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { accounts } from '@/lib/db/accountSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
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

    if (action === 'generate_invoice' || action === 'regenerate_invoice') {
      // Check if regenerating
      const isRegenerate = action === 'regenerate_invoice';
      
      // If regenerating, check if invoice exists
      if (isRegenerate && !order.invoicedAt) {
        return NextResponse.json({ 
          error: 'Cannot regenerate - no invoice exists yet' 
        }, { status: 400 });
      }
      
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

      // Generate invoice number (simple format: INV-YYYYMMDD-XXXX)
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
      const invoiceNumber = `INV-${dateStr}-${randomStr}`;

      // Calculate invoice details from price snapshots
      let sitesSubtotal = 0;
      let serviceFeeTotal = 0;
      let wholesaleTotal = 0;
      
      // Get account info for billing
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, order.accountId!)
      });

      // Build invoice items - list each site individually with actual pricing
      const items = [];
      
      // Add each approved site as a line item using price snapshots
      for (const submission of approvedSubmissions) {
        // Get domain info
        const domain = await db.query.bulkAnalysisDomains.findFirst({
          where: eq(bulkAnalysisDomains.id, submission.domainId)
        });
        
        // Use price snapshot if available, fallback to default pricing
        const retailPrice = submission.retailPriceSnapshot || 27900; // Default $279
        const wholesalePrice = submission.wholesalePriceSnapshot || (retailPrice - 7900);
        const serviceFee = submission.serviceFeeSnapshot || 7900; // $79 service fee
        
        sitesSubtotal += retailPrice;
        wholesaleTotal += wholesalePrice;
        serviceFeeTotal += serviceFee;
        
        items.push({
          description: `Guest Post - ${domain?.domain || 'Site'}`,
          quantity: 1,
          unitPrice: retailPrice,
          total: retailPrice
        });
      }
      
      // Get optional services from order
      const clientReviewFee = order.clientReviewFee || 0;
      const rushFee = order.rushFee || 0;
      const discountAmount = order.discountAmount || 0;

      // Add optional services
      if (clientReviewFee > 0) {
        items.push({
          description: 'Client Review Service',
          quantity: 1,
          unitPrice: clientReviewFee,
          total: clientReviewFee
        });
      }

      if (rushFee > 0) {
        items.push({
          description: 'Rush Delivery',
          quantity: 1,
          unitPrice: rushFee,
          total: rushFee
        });
      }

      // Calculate final totals
      const invoiceSubtotal = sitesSubtotal + clientReviewFee + rushFee;
      const finalTotal = invoiceSubtotal - discountAmount;

      // Create invoice data
      const invoiceData = {
        invoiceNumber,
        issueDate: now.toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
        items,
        subtotal: invoiceSubtotal,
        discount: discountAmount,
        total: finalTotal,
        billingInfo: account ? {
          name: account.contactName || '',
          company: account.companyName || '',
          email: account.email,
          address: account.billingAddress || undefined
        } : undefined
      };

      // Update order with correct pricing and invoice data
      const updatedOrder = await db.update(orders)
        .set({
          // Update pricing to reflect actual costs
          subtotalRetail: sitesSubtotal,
          totalRetail: finalTotal,
          totalWholesale: wholesaleTotal,
          profitMargin: serviceFeeTotal,
          discountAmount: discountAmount,
          // State and invoice tracking  
          state: 'payment_pending',
          invoicedAt: new Date(),
          invoiceData,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      return NextResponse.json({
        success: true,
        order: updatedOrder[0],
        message: isRegenerate ? 'Invoice regenerated successfully' : 'Invoice generated successfully',
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