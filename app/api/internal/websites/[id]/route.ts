import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherOfferings, publisherOfferingRelationships, publishers } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

// GET /api/internal/websites/[id] - Get website details with offerings
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    // Get website details
    const [website] = await db
      .select()
      .from(websites)
      .where(eq(websites.id, id))
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Get offerings associated with this website
    const offerings = await db
      .select({
        id: publisherOfferings.id,
        publisherId: publisherOfferings.publisherId,
        offeringType: publisherOfferings.offeringType,
        basePrice: publisherOfferings.basePrice,
        currency: publisherOfferings.currency,
        turnaroundDays: publisherOfferings.turnaroundDays,
        minWordCount: publisherOfferings.minWordCount,
        maxWordCount: publisherOfferings.maxWordCount,
        currentAvailability: publisherOfferings.currentAvailability,
        expressAvailable: publisherOfferings.expressAvailable,
        expressPrice: publisherOfferings.expressPrice,
        expressDays: publisherOfferings.expressDays,
        attributes: publisherOfferings.attributes,
        publisherName: publishers.companyName,
      })
      .from(publisherOfferings)
      .innerJoin(
        publisherOfferingRelationships,
        eq(publisherOfferings.id, publisherOfferingRelationships.offeringId)
      )
      .leftJoin(
        publishers,
        eq(publisherOfferings.publisherId, publishers.id)
      )
      .where(eq(publisherOfferingRelationships.websiteId, id));

    return NextResponse.json({
      website,
      offerings,
    });
  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/internal/websites/[id] - Update website and offerings
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { website: websiteData, offerings: offeringsData } = body;

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Update website
      const [updatedWebsite] = await tx
        .update(websites)
        .set({
          categories: websiteData.categories,
          niche: websiteData.niche,
          websiteType: websiteData.websiteType,
          totalTraffic: websiteData.totalTraffic,
          domainRating: websiteData.domainRating,
          internalQualityScore: websiteData.internalQualityScore,
          internalNotes: websiteData.internalNotes,
          updatedAt: new Date(),
        })
        .where(eq(websites.id, id))
        .returning();

      if (!updatedWebsite) {
        throw new Error('Website not found');
      }

      // For internal management, we'll create offerings under a special "internal" publisher
      // First, check if we have an internal publisher account
      let [internalPublisher] = await tx
        .select()
        .from(publishers)
        .where(eq(publishers.email, 'internal@system.local'))
        .limit(1);

      // Create internal publisher if it doesn't exist
      if (!internalPublisher) {
        [internalPublisher] = await tx
          .insert(publishers)
          .values({
            id: crypto.randomUUID(),
            email: 'internal@system.local',
            companyName: 'Internal Management',
            contactName: 'Internal System',
            password: 'not-used', // This account can't login
            status: 'active',
          })
          .returning();
      }

      // Delete existing offerings for this website managed by internal
      const existingRelationships = await tx
        .select()
        .from(publisherOfferingRelationships)
        .where(
          and(
            eq(publisherOfferingRelationships.websiteId, id),
            eq(publisherOfferingRelationships.publisherId, internalPublisher.id)
          )
        );

      // Delete old offerings
      for (const rel of existingRelationships) {
        if (rel.offeringId) {
          await tx
            .delete(publisherOfferings)
            .where(eq(publisherOfferings.id, rel.offeringId));
        }
      }

      // Delete old relationships
      await tx
        .delete(publisherOfferingRelationships)
        .where(
          and(
            eq(publisherOfferingRelationships.websiteId, id),
            eq(publisherOfferingRelationships.publisherId, internalPublisher.id)
          )
        );

      // Create new offerings
      const createdOfferings = [];
      for (const offeringData of offeringsData) {
        const [newOffering] = await tx
          .insert(publisherOfferings)
          .values({
            publisherId: internalPublisher.id,
            offeringType: offeringData.offeringType,
            basePrice: offeringData.basePrice,
            currency: offeringData.currency || 'USD',
            turnaroundDays: offeringData.turnaroundDays,
            minWordCount: offeringData.minWordCount,
            maxWordCount: offeringData.maxWordCount,
            currentAvailability: offeringData.currentAvailability || 'available',
            expressAvailable: offeringData.expressAvailable || false,
            expressPrice: offeringData.expressPrice,
            expressDays: offeringData.expressDays,
            attributes: offeringData.attributes || {},
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        createdOfferings.push(newOffering);

        // Create relationship
        await tx
          .insert(publisherOfferingRelationships)
          .values({
            publisherId: internalPublisher.id,
            offeringId: newOffering.id,
            websiteId: id,
            isPrimary: createdOfferings.length === 1,
            isActive: true,
            relationshipType: 'owner',
            verificationStatus: 'verified',
            verificationMethod: 'internal',
            verifiedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
      }

      // Update website flags based on offerings
      const hasGuestPost = offeringsData.some((o: any) => o.offeringType === 'guest_post');
      const hasLinkInsert = offeringsData.some((o: any) => o.offeringType === 'link_insertion');
      
      await tx
        .update(websites)
        .set({
          hasGuestPost,
          hasLinkInsert,
          updatedAt: new Date(),
        })
        .where(eq(websites.id, id));

      return {
        website: updatedWebsite,
        offerings: createdOfferings,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating website:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/internal/websites/[id] - Delete website
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    // Delete website (cascade will handle relationships)
    await db
      .delete(websites)
      .where(eq(websites.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}