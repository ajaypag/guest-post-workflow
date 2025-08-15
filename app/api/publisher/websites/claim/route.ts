import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherOfferingRelationships } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { z } from 'zod';

// Input validation schema
const claimSchema = z.object({
  websiteId: z.string().uuid(),
  relationshipType: z.enum(['owner', 'manager', 'contact', 'agency', 'broker']).default('contact'),
  notes: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID not found in session' },
        { status: 400 }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = claimSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { websiteId, relationshipType, notes } = validation.data;

    // Check if website exists
    const website = await db.select({
      id: websites.id,
      domain: websites.domain
    })
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

    if (website.length === 0) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Check if publisher already has a relationship with this website
    const existingRelationship = await db.select({
      id: publisherOfferingRelationships.id
    })
    .from(publisherOfferingRelationships)
    .where(
      and(
        eq(publisherOfferingRelationships.websiteId, websiteId),
        eq(publisherOfferingRelationships.publisherId, session.publisherId)
      )
    )
    .limit(1);

    if (existingRelationship.length > 0) {
      return NextResponse.json(
        { error: 'You already have a relationship with this website' },
        { status: 409 }
      );
    }

    // Create the relationship
    const [newRelationship] = await db.insert(publisherOfferingRelationships)
      .values({
        publisherId: session.publisherId,
        websiteId: websiteId,
        relationshipType: relationshipType,
        verificationStatus: 'claimed',
        isActive: true,
        isPrimary: false, // Will be primary if they're the first publisher
        publisherNotes: notes,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Check if this is the first publisher for this website
    const allRelationships = await db.select({
      id: publisherOfferingRelationships.id
    })
    .from(publisherOfferingRelationships)
    .where(eq(publisherOfferingRelationships.websiteId, websiteId));

    // If this is the first relationship, make it primary
    if (allRelationships.length === 1) {
      await db.update(publisherOfferingRelationships)
        .set({ 
          isPrimary: true,
          updatedAt: new Date()
        })
        .where(eq(publisherOfferingRelationships.id, newRelationship.id));
    }

    return NextResponse.json({
      success: true,
      relationship: newRelationship,
      website: website[0]
    });

  } catch (error) {
    console.error('Website claim error:', error);
    return NextResponse.json(
      { error: 'Failed to claim website' },
      { status: 500 }
    );
  }
}