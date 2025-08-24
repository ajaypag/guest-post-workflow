import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publishers, publisherOfferings, publisherOfferingRelationships } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

// POST /api/internal/websites - Create a new website with offerings
export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { website: websiteData, offerings: offeringsData } = body;

    if (!websiteData.domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Normalize domain
    const normalizedDomain = String(normalizeDomain(websiteData.domain));

    // Check if website already exists
    const [existingWebsite] = await db
      .select()
      .from(websites)
      .where(eq(websites.domain, normalizedDomain))
      .limit(1);

    if (existingWebsite) {
      return NextResponse.json(
        { error: 'Website already exists with this domain' },
        { status: 400 }
      );
    }

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Create the website
      const [newWebsite] = await tx
        .insert(websites)
        .values({
          id: crypto.randomUUID(),
          domain: normalizedDomain,
          categories: websiteData.categories || [],
          niche: websiteData.niche || [],
          websiteType: websiteData.websiteType || [],
          totalTraffic: websiteData.totalTraffic,
          domainRating: websiteData.domainRating,
          internalQualityScore: websiteData.internalQualityScore,
          internalNotes: websiteData.internalNotes,
          status: 'Active',
          hasGuestPost: offeringsData.some((o: any) => o.offeringType === 'guest_post'),
          hasLinkInsert: offeringsData.some((o: any) => o.offeringType === 'link_insertion'),
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          airtableCreatedAt: new Date(),
          airtableUpdatedAt: new Date(),
        })
        .returning();

      // Get or create internal publisher account
      let [internalPublisher] = await tx
        .select()
        .from(publishers)
        .where(eq(publishers.email, 'internal@system.local'))
        .limit(1);

      if (!internalPublisher) {
        [internalPublisher] = await tx
          .insert(publishers)
          .values({
            id: crypto.randomUUID(),
            email: 'internal@system.local',
            companyName: 'Internal Management',
            contactName: 'Internal System',
            password: 'placeholder-system-account', // This account can't login
            status: 'active',
          })
          .returning();
      }

      // Create offerings
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
            websiteId: newWebsite.id,
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

      return {
        websiteId: newWebsite.id,
        offerings: createdOfferings,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating website:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}