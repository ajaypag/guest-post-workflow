import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { InvoicePdfService } from '@/lib/services/invoicePdfService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account' && order.accountId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if invoice exists
    if (!order.invoiceData || !order.invoicedAt) {
      return NextResponse.json({ error: 'Invoice not generated yet' }, { status: 400 });
    }

    // Generate PDF - handle nullable accountId
    const invoiceData = order.invoiceData as any;
    const orderForPdf = {
      ...order,
      accountId: order.accountId || '' // Ensure accountId is always a string
    };
    const pdfBuffer = InvoicePdfService.generateInvoicePdf(invoiceData, orderForPdf as any);

    // Return PDF as download
    const filename = `invoice-${invoiceData.invoiceNumber || orderId.substring(0, 8)}.pdf`;
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice PDF' },
      { status: 500 }
    );
  }
}