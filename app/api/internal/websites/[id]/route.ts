import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publishers, publisherWebsites } from '@/lib/db/schema';
import { publisherOfferingRelationships, publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { getWebsiteMetadata } from '@/lib/services/websiteMetadataService';

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

    const { id: websiteId } = await params;

    const website = await db
      .select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website.length) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Get offerings for this website
    const offerings = await db
      .select({
        id: publisherOfferings.id,
        offeringType: publisherOfferings.offeringType,
        offeringName: publisherOfferings.offeringName,
        basePrice: publisherOfferings.basePrice,
        currency: publisherOfferings.currency,
        turnaroundDays: publisherOfferings.turnaroundDays,
        minWordCount: publisherOfferings.minWordCount,
        maxWordCount: publisherOfferings.maxWordCount,
        niches: publisherOfferings.niches,
        languages: publisherOfferings.languages,
        currentAvailability: publisherOfferings.currentAvailability,
        expressAvailable: publisherOfferings.expressAvailable,
        expressPrice: publisherOfferings.expressPrice,
        expressDays: publisherOfferings.expressDays,
        attributes: publisherOfferings.attributes,
        isActive: publisherOfferings.isActive,
        publisherId: publisherOfferings.publisherId,
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
      .where(eq(publisherOfferingRelationships.websiteId, websiteId));

    // Get publisher relationships for this website (using publisher_websites to avoid duplicates)
    const publisherRelationships = await db
      .selectDistinctOn([publisherWebsites.publisherId], {
        id: publisherOfferingRelationships.id,
        publisherId: publisherWebsites.publisherId,
        isActive: publisherWebsites.status,
        isPrimary: publisherOfferingRelationships.isPrimary,
        relationshipType: publisherOfferingRelationships.relationshipType,
        verificationStatus: publisherOfferingRelationships.verificationStatus,
        publisherEmail: publishers.email,
        publisherName: publishers.contactName,
        publisherCompany: publishers.companyName,
        publisherPhone: publishers.phone,
        publisherPaymentEmail: publishers.paymentEmail,
        publisherPaymentMethod: publishers.paymentMethod,
        publisherAccountStatus: publishers.accountStatus,
      })
      .from(publisherWebsites)
      .leftJoin(publishers, eq(publisherWebsites.publisherId, publishers.id))
      .leftJoin(
        publisherOfferingRelationships, 
        eq(publisherWebsites.publisherId, publisherOfferingRelationships.publisherId)
      )
      .where(eq(publisherWebsites.websiteId, websiteId))
      .orderBy(publisherWebsites.publisherId, publisherWebsites.addedAt);

    // Get metadata options for the edit form
    const metadata = await getWebsiteMetadata();

    return NextResponse.json({
      website: website[0],
      offerings: offerings,
      publisherRelationships: publisherRelationships,
      metadata: metadata
    });
  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: websiteId } = await params;
    const updates = await request.json();

    // Remove fields that shouldn't be updated directly
    const { id, createdAt, updatedAt, ...updateData } = updates;

    // Update the website
    const updatedWebsite = await db
      .update(websites)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, websiteId))
      .returning();

    if (!updatedWebsite.length) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      website: updatedWebsite[0]
    });
  } catch (error) {
    console.error('Error updating website:', error);
    return NextResponse.json(
      { error: 'Failed to update website' },
      { status: 500 }
    );
  }
}