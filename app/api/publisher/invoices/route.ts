import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'publisher' || !session.publisherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      description,
      notes,
      lineItems,
      grossAmount,
      taxAmount,
      totalAmount
    } = body;

    // Validate required fields
    if (!invoiceNumber || !invoiceDate || !description || !grossAmount || !totalAmount) {
      return NextResponse.json({ 
        error: 'Missing required fields: invoiceNumber, invoiceDate, description, grossAmount, totalAmount' 
      }, { status: 400 });
    }

    if (grossAmount <= 0 || totalAmount <= 0) {
      return NextResponse.json({ 
        error: 'Invoice amounts must be greater than 0' 
      }, { status: 400 });
    }

    // Check for duplicate invoice number for this publisher
    const existingInvoice = await db.execute(sql`
      SELECT id FROM publisher_invoices 
      WHERE publisher_id = ${session.publisherId} AND invoice_number = ${invoiceNumber}
    `);

    if (existingInvoice.rows.length > 0) {
      return NextResponse.json({ 
        error: 'Invoice number already exists. Please use a unique invoice number.' 
      }, { status: 400 });
    }

    // Create the invoice
    const result = await db.execute(sql`
      INSERT INTO publisher_invoices (
        id, publisher_id, invoice_number, invoice_date, due_date,
        gross_amount, tax_amount, total_amount, description, notes,
        line_items, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${session.publisherId}, ${invoiceNumber}, ${invoiceDate}, ${dueDate || null},
        ${grossAmount}, ${taxAmount || 0}, ${totalAmount}, ${description}, ${notes || null},
        ${JSON.stringify(lineItems || [])}, 'pending', NOW(), NOW()
      )
      RETURNING id, invoice_number, status, total_amount, created_at
    `);

    const invoice = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Invoice submitted successfully',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        totalAmount: invoice.total_amount,
        createdAt: invoice.created_at
      }
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'publisher' || !session.publisherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    
    const offset = (page - 1) * limit;

    // Build query conditions
    let whereClause = 'WHERE publisher_id = $1';
    const args = [session.publisherId];
    
    if (status && status !== 'all') {
      whereClause += ' AND status = $2';
      args.push(status);
    }

    // Get invoices with pagination
    // Build query dynamically with parameterized values
    const finalArgs = [...args, limit, offset];
    const invoicesQuery = `
      SELECT 
        id, invoice_number, invoice_date, due_date,
        gross_amount, tax_amount, total_amount, currency,
        description, status, created_at, updated_at,
        reviewed_at, approved_at, paid_at,
        review_notes, payment_method, payment_reference
      FROM publisher_invoices 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${args.length + 1} OFFSET $${args.length + 2}
    `;
    // Using raw SQL with manual parameter binding
    const invoicesResult = await (db as any).execute({ sql: invoicesQuery, args: finalArgs });

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM publisher_invoices 
      ${whereClause}
    `;
    const countResult = await (db as any).execute({ sql: countQuery, args: args });

    const totalCount = Number(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    // Get summary stats
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount END), 0) as total_paid
      FROM publisher_invoices 
      WHERE publisher_id = ${session.publisherId}
    `);

    const stats = statsResult.rows[0];

    return NextResponse.json({
      invoices: invoicesResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      },
      stats: {
        totalInvoices: Number(stats.total_invoices),
        pendingInvoices: Number(stats.pending_invoices),
        approvedInvoices: Number(stats.approved_invoices),
        paidInvoices: Number(stats.paid_invoices),
        totalPaid: Number(stats.total_paid)
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}