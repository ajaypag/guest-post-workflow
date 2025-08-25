import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publisherOfferingRelationships, publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publisherId } = body;
    
    if (!publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID is required' },
        { status: 400 }
      );
    }
    
    // Delete existing relationships
    const deletedRelationships = await db
      .delete(publisherOfferingRelationships)
      .where(eq(publisherOfferingRelationships.publisherId, publisherId))
      .returning();
    
    // Delete existing offerings
    const deletedOfferings = await db
      .delete(publisherOfferings)
      .where(eq(publisherOfferings.publisherId, publisherId))
      .returning();
    
    return NextResponse.json({
      success: true,
      message: 'Cleared publisher relationships and offerings',
      publisherId,
      deletedRelationships: deletedRelationships.length,
      deletedOfferings: deletedOfferings.length
    });
    
  } catch (error) {
    console.error('Failed to clear relationships:', error);
    return NextResponse.json(
      { error: 'Failed to clear relationships' },
      { status: 500 }
    );
  }
}