import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { payments, invoices } from '@/lib/db/paymentSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { EmailService } from '@/lib/services/emailService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - only internal users can record payments
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can record payments' }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await request.json();

    // Validate required fields
    const { 
      amount, 
      paymentMethod, 
      transactionId,
      notes,
      generateInvoice = true 
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount required' }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method required' }, { status: 400 });
    }

    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        account: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.accountId) {
      return NextResponse.json({ error: 'Order has no associated account' }, { status: 400 });
    }

    if (order.paidAt) {
      return NextResponse.json({ 
        error: 'Order already marked as paid', 
        paidAt: order.paidAt 
      }, { status: 400 });
    }

    // Verify amount matches order total (allow small differences for processing fees)
    const expectedAmount = order.totalRetail;
    const tolerance = expectedAmount * 0.03; // 3% tolerance for fees
    
    if (Math.abs(amount - expectedAmount) > tolerance) {
      return NextResponse.json({ 
        error: 'Payment amount does not match order total',
        expected: expectedAmount / 100, // Convert cents to dollars for display
        received: amount / 100,
        difference: Math.abs(amount - expectedAmount) / 100
      }, { status: 400 });
    }

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      const paymentDate = new Date();
      
      // Create payment record
      const [payment] = await tx.insert(payments).values({
        orderId,
        accountId: order.accountId!,  // We've already checked it's not null above
        amount,
        status: 'completed',
        method: paymentMethod,
        transactionId: transactionId || undefined,
        notes: notes || undefined,
        recordedBy: session.userId,
        processedAt: paymentDate,
      }).returning();

      // Check if this completes the order payment
      const isFullyPaid = amount >= expectedAmount;
      const paymentStatus = isFullyPaid ? 'completed' : 'partial';
      
      // Update order with payment info
      await tx.update(orders)
        .set({
          paidAt: isFullyPaid ? paymentDate : null,
          status: isFullyPaid ? 'confirmed' : order.status,
          state: isFullyPaid ? 'payment_received' : 'partial_payment',
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      // Generate invoice if requested
      let invoice = null;
      if (generateInvoice && isFullyPaid) {
        invoice = await generateAndStoreInvoice(tx, order, payment);
      }

      // Send payment confirmation email
      if (isFullyPaid) {
        await sendPaymentConfirmationEmail(order, payment, invoice);
      }

      return { payment, invoice, isFullyPaid };
    });

    // Log payment activity
    console.log(`Payment recorded for order ${orderId}:`, {
      amount: amount / 100,
      method: paymentMethod,
      transactionId,
      recordedBy: session.email,
      isFullyPaid: result.isFullyPaid
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentId: result.payment.id,
      paidAt: result.payment.processedAt,
      amount: amount / 100, // Return in dollars
      paymentMethod,
      transactionId,
      invoice: result.invoice,
      isFullyPaid: result.isFullyPaid,
      message: result.isFullyPaid 
        ? 'Payment recorded successfully. Workflows can now be generated.'
        : 'Partial payment recorded. Additional payment required.'
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { error: 'Failed to record payment', details: error },
      { status: 500 }
    );
  }
}

// Helper function to generate and store invoice
async function generateAndStoreInvoice(tx: any, order: any, payment: any) {
  const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  
  // Prepare line items
  const lineItems = [
    {
      description: 'Guest Post Order',
      quantity: 1,
      unitPrice: order.subtotalRetail / 100,
      total: order.subtotalRetail / 100
    },
    ...(order.discountAmount > 0 ? [{
      description: `Discount (${order.discountPercent}%)`,
      quantity: 1,
      unitPrice: -(order.discountAmount / 100),
      total: -(order.discountAmount / 100)
    }] : []),
    ...(order.rushFee > 0 ? [{
      description: 'Rush Delivery Fee',
      quantity: 1,
      unitPrice: order.rushFee / 100,
      total: order.rushFee / 100
    }] : []),
    ...(order.clientReviewFee > 0 ? [{
      description: 'Client Review Service',
      quantity: 1,
      unitPrice: order.clientReviewFee / 100,
      total: order.clientReviewFee / 100
    }] : [])
  ];

  // Create invoice record
  const [invoice] = await tx.insert(invoices).values({
    orderId: order.id,
    paymentId: payment.id,
    invoiceNumber,
    status: 'paid',
    subtotal: order.subtotalRetail,
    tax: 0,
    discount: order.discountAmount,
    total: order.totalRetail,
    issueDate: new Date(),
    dueDate: new Date(),
    paidDate: payment.processedAt,
    lineItems,
  }).returning();

  // TODO: Generate PDF and upload to cloud storage
  // invoice.fileUrl = await generateInvoicePDF(invoice, order, payment);

  return invoice;
}

// Helper function to send payment confirmation email
async function sendPaymentConfirmationEmail(order: any, payment: any, invoice: any) {
  try {
    const emailData = {
      to: order.account?.email || order.accountEmail,
      subject: `Payment Confirmed - Order #${order.id.slice(0, 8)}`,
      html: `
        <h2>Payment Confirmation</h2>
        <p>Dear ${order.account?.contactName || order.accountName},</p>
        
        <p>We have successfully received your payment for order #${order.id.slice(0, 8)}.</p>
        
        <h3>Payment Details:</h3>
        <ul>
          <li><strong>Amount:</strong> $${(payment.amount / 100).toFixed(2)}</li>
          <li><strong>Payment Method:</strong> ${payment.method.replace(/_/g, ' ')}</li>
          ${payment.transactionId ? `<li><strong>Transaction ID:</strong> ${payment.transactionId}</li>` : ''}
          <li><strong>Date:</strong> ${new Date(payment.processedAt).toLocaleDateString()}</li>
        </ul>
        
        ${invoice ? `
        <h3>Invoice Information:</h3>
        <ul>
          <li><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</li>
          <li><strong>Total:</strong> $${(invoice.total / 100).toFixed(2)}</li>
        </ul>
        ` : ''}
        
        <p>Our team will now begin processing your order. You can track the progress in your account dashboard.</p>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>The PostFlow Team</p>
      `
    };

    await EmailService.sendPaymentConfirmation(order.account?.email || order.accountEmail, {
      orderNumber: order.id.slice(0, 8),
      amount: (payment.amount / 100).toFixed(2),
      paymentMethod: payment.method.replace(/_/g, ' '),
      transactionId: payment.transactionId,
      invoiceNumber: invoice?.invoiceNumber,
    });

    console.log('Payment confirmation email sent to:', order.account?.email || order.accountEmail);
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
    // Don't throw - email failure shouldn't break payment recording
  }
}