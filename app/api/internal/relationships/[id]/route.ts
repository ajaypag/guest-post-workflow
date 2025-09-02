import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: relationshipId } = await params;

    // Delete the publisher relationship
    const deletedRelationship = await db
      .delete(publisherOfferingRelationships)
      .where(eq(publisherOfferingRelationships.id, relationshipId))
      .returning();

    if (!deletedRelationship.length) {
      return NextResponse.json(
        { error: 'Publisher relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Publisher relationship removed successfully',
    });
  } catch (error) {
    console.error('Error deleting publisher relationship:', error);
    return NextResponse.json(
      { error: 'Failed to remove publisher relationship' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: relationshipId } = await params;

    // Get the publisher relationship details
    const relationship = await db
      .select()
      .from(publisherOfferingRelationships)
      .where(eq(publisherOfferingRelationships.id, relationshipId))
      .limit(1);

    if (!relationship.length) {
      return NextResponse.json(
        { error: 'Publisher relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      relationship: relationship[0],
    });
  } catch (error) {
    console.error('Error fetching publisher relationship:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publisher relationship' },
      { status: 500 }
    );
  }
}