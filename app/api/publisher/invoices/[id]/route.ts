import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'publisher' || !session.publisherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the invoice, ensuring it belongs to this publisher
    const result = await db.execute(sql`
      SELECT 
        id, invoice_number, invoice_date, due_date,
        gross_amount, tax_amount, total_amount, currency,
        description, notes, line_items, status,
        created_at, updated_at, reviewed_at, approved_at, paid_at,
        review_notes, payment_method, payment_reference,
        reviewed_by, approved_by, paid_by
      FROM publisher_invoices 
      WHERE id = ${id} AND publisher_id = ${session.publisherId}
    `);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = result.rows[0];

    // Parse line_items JSON if it exists
    let lineItems = [];
    if (invoice.line_items) {
      try {
        lineItems = JSON.parse(invoice.line_items as string);
      } catch (error) {
        console.error('Error parsing line_items:', error);
      }
    }

    return NextResponse.json({
      invoice: {
        ...invoice,
        line_items: lineItems
      }
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}