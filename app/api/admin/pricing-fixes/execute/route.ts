import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherWebsites, publisherOfferings, publisherOfferingRelationships, publishers } from '@/lib/db/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { parseAirtableCSV } from '@/lib/utils/csvParser';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { websiteId, proposedPrice, issueType } = body;

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID required' }, { status: 400 });
    }

    // Parse Airtable data
    const airtableRecords = parseAirtableCSV();
    const airtableMap = new Map(airtableRecords.map(r => [r.domain, r]));

    // Get website with all relationships
    const websiteData = await db
      .select({
        websiteId: websites.id,
        domain: websites.domain,
        guestPostCost: websites.guestPostCost,
        publisherId: publisherWebsites.publisherId,
        publisherName: publishers.companyName,
        publisherEmail: publishers.email,
        offeringId: publisherOfferingRelationships.offeringId,
        offeringPrice: publisherOfferings.basePrice,
        offeringName: publisherOfferings.offeringName
      })
      .from(websites)
      .leftJoin(publisherWebsites, eq(publisherWebsites.websiteId, websites.id))
      .leftJoin(publishers, eq(publishers.id, publisherWebsites.publisherId))
      .leftJoin(publisherOfferingRelationships, eq(publisherOfferingRelationships.websiteId, websites.id))
      .leftJoin(publisherOfferings, eq(publisherOfferings.id, publisherOfferingRelationships.offeringId))
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!websiteData[0]) {
      return NextResponse.json({ error: 'Website not found' }, { status: 400 });
    }

    const website = websiteData[0];
    const normalizedDomain = website.domain.toLowerCase().replace(/^www\./, '');
    const airtableData = airtableMap.get(normalizedDomain);
    const priceCents = Math.round(parseFloat(proposedPrice) * 100);

    let result: any = {
      websiteId,
      domain: website.domain,
      action: issueType,
      previousPrice: website.guestPostCost,
      newPrice: proposedPrice
    };

    // Handle different issue types
    switch (issueType) {
      case 'no_publisher':
        // Create publisher from Airtable data if available
        if (airtableData && (airtableData.postflowContactEmails[0] || airtableData.guestPostContact)) {
          const email = airtableData.postflowContactEmails[0] || airtableData.guestPostContact;
          
          // Check if publisher already exists
          const existingPublisher = await db
            .select()
            .from(publishers)
            .where(eq(publishers.email, email))
            .limit(1);

          let publisherId;
          if (existingPublisher[0]) {
            publisherId = existingPublisher[0].id;
          } else {
            // Create new publisher
            const newPublisher = await db
              .insert(publishers)
              .values({
                id: crypto.randomUUID(),
                email,
                contactName: 'Unknown',
                accountStatus: 'shadow',
                source: 'airtable_import',
                sourceMetadata: JSON.stringify({ 
                  domain: normalizedDomain,
                  importDate: new Date().toISOString() 
                })
              })
              .returning();
            publisherId = newPublisher[0].id;
          }

          // Link publisher to website
          await db.insert(publisherWebsites).values({
            id: crypto.randomUUID(),
            publisherId,
            websiteId: website.websiteId
          });

          // Create offering
          const offering = await db.insert(publisherOfferings).values({
            publisherId,
            offeringName: 'Guest Post',
            offeringType: 'guest_post',
            basePrice: priceCents
          }).returning();

          // Link offering to website
          await db.insert(publisherOfferingRelationships).values({
            publisherId,
            offeringId: offering[0].id,
            websiteId: website.websiteId
          });

          result.publisherCreated = true;
          result.offeringCreated = true;
        }
        break;

      case 'no_offering':
        // Create offering for existing publisher
        if (website.publisherId) {
          const offering = await db.insert(publisherOfferings).values({
            publisherId: website.publisherId,
            offeringName: 'Guest Post',
            offeringType: 'guest_post',
            basePrice: priceCents
          }).returning();

          // Link offering to website
          await db.insert(publisherOfferingRelationships).values({
            publisherId: website.publisherId,
            offeringId: offering[0].id,
            websiteId: website.websiteId
          });

          result.offeringCreated = true;
        }
        break;

      case 'price_mismatch':
        // Update existing offering price
        if (website.offeringId) {
          await db
            .update(publisherOfferings)
            .set({ 
              basePrice: priceCents,
              updatedAt: new Date()
            })
            .where(eq(publisherOfferings.id, website.offeringId));

          result.priceUpdated = true;
          result.oldPrice = website.offeringPrice ? website.offeringPrice / 100 : null;
        }
        break;

      case 'multiple_offerings':
        // This is more complex - would need to archive extras
        // For now, just log the issue
        result.message = 'Multiple offerings need manual review';
        break;
    }

    // Update guest_post_cost to match
    await db
      .update(websites)
      .set({ 
        guestPostCost: proposedPrice.toString(),
        updatedAt: new Date()
      })
      .where(eq(websites.id, websiteId));

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Execute error:', error);
    return NextResponse.json(
      { error: 'Failed to execute fix', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}