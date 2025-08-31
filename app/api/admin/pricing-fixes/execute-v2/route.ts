import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherWebsites, publisherOfferings, publisherOfferingRelationships, publishers } from '@/lib/db/schema';
import { eq, sql, and, isNull, or, ilike } from 'drizzle-orm';
import { parseAirtableCSV } from '@/lib/utils/csvParser';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { websiteId, proposedPrice, issueType, dryRun = false } = body;

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
        publisherStatus: publishers.accountStatus,
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
      newPrice: proposedPrice,
      dryRun,
      operations: []
    };

    // Handle different issue types
    switch (issueType) {
      case 'no_publisher':
        // Get email from Airtable
        const emails = [
          ...(airtableData?.postflowContactEmails || []),
          airtableData?.guestPostContact
        ].filter(e => e);
        
        if (emails.length === 0) {
          result.error = 'No email found in Airtable data';
          result.requiresManualReview = true;
          break;
        }
        
        const email = emails[0].toLowerCase();
        
        // Check if publisher already exists with this email
        const existingPublisher = await db
          .select()
          .from(publishers)
          .where(eq(publishers.email, email))
          .limit(1);

        let publisherId;
        
        if (existingPublisher[0]) {
          // Publisher exists - just link it
          publisherId = existingPublisher[0].id;
          result.operations.push({
            type: 'link_existing_publisher',
            publisherId,
            email,
            status: existingPublisher[0].accountStatus
          });
          
          // Check if already linked
          const existingLink = await db
            .select()
            .from(publisherWebsites)
            .where(and(
              eq(publisherWebsites.publisherId, publisherId),
              eq(publisherWebsites.websiteId, website.websiteId)
            ))
            .limit(1);
          
          if (existingLink[0]) {
            result.operations.push({
              type: 'already_linked',
              message: 'Publisher already linked to website'
            });
          } else {
            if (!dryRun) {
              // Create publisher-website link
              await db.insert(publisherWebsites).values({
                publisherId,
                websiteId: website.websiteId,
                canEditPricing: true,
                canEditAvailability: true,
                canViewAnalytics: true,
                status: 'active'
              });
            }
            result.operations.push({
              type: 'created_publisher_website_link'
            });
          }
        } else {
          // Create new shadow publisher
          if (!dryRun) {
            const newPublisher = await db
              .insert(publishers)
              .values({
                email,
                contactName: 'Unknown',
                accountStatus: 'shadow',
                source: 'airtable_import',
                sourceMetadata: JSON.stringify({ 
                  domain: normalizedDomain,
                  importDate: new Date().toISOString(),
                  airtablePrice: airtableData?.guestPostCost
                })
              })
              .returning();
            publisherId = newPublisher[0].id;
          } else {
            publisherId = 'DRY_RUN_ID';
          }
          
          result.operations.push({
            type: 'created_shadow_publisher',
            email,
            publisherId
          });
          
          if (!dryRun) {
            // Create publisher-website link
            await db.insert(publisherWebsites).values({
              publisherId,
              websiteId: website.websiteId,
              canEditPricing: true,
              canEditAvailability: true,
              canViewAnalytics: true,
              status: 'active'
            });
          }
          result.operations.push({
            type: 'created_publisher_website_link'
          });
        }

        // Create offering
        // NOTE: We assume 'guest_post' type since 99.7% of existing offerings are guest posts
        // This could be made configurable if needed for other offering types
        if (!dryRun) {
          const offering = await db.insert(publisherOfferings).values({
            publisherId,
            offeringType: 'guest_post', // Assumption based on existing data
            basePrice: priceCents,
            currency: 'USD',
            currentAvailability: 'available',
            isActive: true
            // Removed: offeringName (usually NULL), turnaroundDays (varies)
          }).returning();

          // Create offering relationship - only set required fields
          // Let database defaults handle: isPrimary (false), relationshipType ('contact'), 
          // verificationStatus ('claimed'), priorityRank (100), isPreferred (false)
          await db.insert(publisherOfferingRelationships).values({
            publisherId,
            offeringId: offering[0].id,
            websiteId: website.websiteId
            // isActive defaults to true, which is appropriate
          });
          
          result.operations.push({
            type: 'created_offering',
            offeringId: offering[0].id,
            price: proposedPrice
          });
          result.operations.push({
            type: 'created_offering_relationship'
          });
        } else {
          result.operations.push({
            type: 'would_create_offering',
            price: proposedPrice
          });
          result.operations.push({
            type: 'would_create_offering_relationship'
          });
        }
        break;

      case 'no_offering':
        // Create offering for existing publisher
        if (!website.publisherId) {
          result.error = 'No publisher linked to website';
          result.requiresManualReview = true;
          break;
        }
        
        if (!dryRun) {
          const offering = await db.insert(publisherOfferings).values({
            publisherId: website.publisherId,
            offeringType: 'guest_post', // Assumption based on existing data
            basePrice: priceCents,
            currency: 'USD',
            currentAvailability: 'available',
            isActive: true
            // Using minimal fields - let database defaults handle the rest
          }).returning();

          // Create offering relationship - only set required fields
          await db.insert(publisherOfferingRelationships).values({
            publisherId: website.publisherId,
            offeringId: offering[0].id,
            websiteId: website.websiteId
            // Use database defaults for other fields
          });
          
          result.operations.push({
            type: 'created_offering',
            offeringId: offering[0].id,
            price: proposedPrice
          });
          result.operations.push({
            type: 'created_offering_relationship'
          });
        } else {
          result.operations.push({
            type: 'would_create_offering',
            publisherId: website.publisherId,
            price: proposedPrice
          });
          result.operations.push({
            type: 'would_create_offering_relationship'
          });
        }
        break;

      case 'price_mismatch':
        // Update existing offering price
        if (!website.offeringId) {
          result.error = 'No offering found to update';
          result.requiresManualReview = true;
          break;
        }
        
        if (!dryRun) {
          await db
            .update(publisherOfferings)
            .set({ 
              basePrice: priceCents,
              updatedAt: new Date()
            })
            .where(eq(publisherOfferings.id, website.offeringId));
        }
        
        result.operations.push({
          type: dryRun ? 'would_update_price' : 'updated_price',
          offeringId: website.offeringId,
          oldPrice: website.offeringPrice ? website.offeringPrice / 100 : null,
          newPrice: proposedPrice
        });
        break;

      case 'multiple_offerings':
        result.error = 'Multiple offerings require manual review';
        result.requiresManualReview = true;
        result.message = 'Please manually review which offering to keep';
        break;

      default:
        result.error = `Unknown issue type: ${issueType}`;
    }

    // Update guest_post_cost to match (unless dry run)
    if (!dryRun && !result.error) {
      await db
        .update(websites)
        .set({ 
          guestPostCost: proposedPrice.toString(),
          updatedAt: new Date()
        })
        .where(eq(websites.id, websiteId));
      
      result.operations.push({
        type: 'updated_guest_post_cost',
        newValue: proposedPrice
      });
    } else if (!result.error) {
      result.operations.push({
        type: 'would_update_guest_post_cost',
        newValue: proposedPrice
      });
    }

    return NextResponse.json({
      success: !result.error,
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