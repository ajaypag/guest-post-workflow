import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    // Only internal users can access this endpoint
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized - Internal access only' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const publisher = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, id))
      .limit(1);

    if (!publisher.length) {
      return NextResponse.json(
        { error: 'Publisher not found' },
        { status: 404 }
      );
    }

    // Remove sensitive fields
    const { password, ...publisherData } = publisher[0];

    return NextResponse.json({
      success: true,
      publisher: publisherData
    });

  } catch (error) {
    console.error('Error fetching publisher:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch publisher',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    // Only internal users can update publishers via this endpoint
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized - Internal access only' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if publisher exists
    const existingPublisher = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, id))
      .limit(1);

    if (!existingPublisher.length) {
      return NextResponse.json(
        { error: 'Publisher not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.companyName || !body.email) {
      return NextResponse.json(
        { error: 'Company name and email are required' },
        { status: 400 }
      );
    }

    // Check if email is being changed and if it conflicts with another publisher
    if (body.email !== existingPublisher[0].email) {
      const emailConflict = await db
        .select()
        .from(publishers)
        .where(eq(publishers.email, body.email))
        .limit(1);

      if (emailConflict.length > 0) {
        return NextResponse.json(
          { error: 'A publisher with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Update publisher
    const updatedPublisher = await db
      .update(publishers)
      .set({
        companyName: body.companyName || null,
        email: body.email,
        contactName: body.contactName,
        phone: body.phone || null,
        status: body.status || 'pending',
        updatedAt: new Date(),
      })
      .where(eq(publishers.id, id))
      .returning();

    if (!updatedPublisher.length) {
      return NextResponse.json(
        { error: 'Failed to update publisher' },
        { status: 500 }
      );
    }

    // Remove sensitive fields from response
    const { password, ...publisherData } = updatedPublisher[0];

    return NextResponse.json({
      success: true,
      message: 'Publisher updated successfully',
      publisher: publisherData
    });

  } catch (error) {
    console.error('Error updating publisher:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update publisher',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    // Only internal users can delete publishers
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized - Internal access only' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if publisher exists
    const existingPublisher = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, id))
      .limit(1);

    if (!existingPublisher.length) {
      return NextResponse.json(
        { error: 'Publisher not found' },
        { status: 404 }
      );
    }

    // Delete publisher (this will cascade to related records due to foreign key constraints)
    await db
      .delete(publishers)
      .where(eq(publishers.id, id));

    return NextResponse.json({
      success: true,
      message: 'Publisher deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting publisher:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete publisher',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}