import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

// GET /api/internal/offerings/[id] - Get offering details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is internal/admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const offering = await db
      .select()
      .from(publisherOfferings)
      .where(eq(publisherOfferings.id, id))
      .limit(1);

    if (!offering.length) {
      return NextResponse.json({ error: 'Offering not found' }, { status: 404 });
    }

    return NextResponse.json({ offering: offering[0] });
  } catch (error) {
    console.error('Error fetching offering:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offering' },
      { status: 500 }
    );
  }
}

// PUT /api/internal/offerings/[id] - Update offering
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is internal/admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.basePrice || body.basePrice < 0) {
      return NextResponse.json(
        { error: 'Invalid base price' },
        { status: 400 }
      );
    }

    // Update the offering - no defaults for word counts or turnaround
    const updateData: any = {
      offeringName: body.offeringName,
      offeringType: body.offeringType,
      basePrice: body.basePrice,
      currency: body.currency || 'USD',
      turnaroundDays: body.turnaroundDays || null, // No default
      minWordCount: body.minWordCount || null, // No default
      maxWordCount: body.maxWordCount || null, // No default
      currentAvailability: body.currentAvailability || 'available',
      expressAvailable: body.expressAvailable || false,
      expressPrice: body.expressPrice,
      expressDays: body.expressDays,
      isActive: body.isActive ?? true,
      updatedAt: new Date()
    };
    
    // Add new fields if provided
    if (body.niches !== undefined) {
      updateData.niches = body.niches;
    }
    if (body.languages !== undefined) {
      updateData.languages = body.languages;
    }
    if (body.attributes !== undefined) {
      updateData.attributes = body.attributes;
    }

    const updated = await db
      .update(publisherOfferings)
      .set(updateData)
      .where(eq(publisherOfferings.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json(
        { error: 'Offering not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      offering: updated[0] 
    });
  } catch (error) {
    console.error('Error updating offering:', error);
    return NextResponse.json(
      { error: 'Failed to update offering' },
      { status: 500 }
    );
  }
}

// DELETE /api/internal/offerings/[id] - Delete offering
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is internal/admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Soft delete by setting isActive to false
    const updated = await db
      .update(publisherOfferings)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(publisherOfferings.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json(
        { error: 'Offering not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Offering deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting offering:', error);
    return NextResponse.json(
      { error: 'Failed to delete offering' },
      { status: 500 }
    );
  }
}