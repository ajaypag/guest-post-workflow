import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherWebsites, publisherOfferings, publisherOfferingRelationships, publishers } from '@/lib/db/schema';
import { eq, sql, and, isNull, or, ilike } from 'drizzle-orm';
import { parseAirtableCSV, getAllEmailsFromRecord } from '@/lib/utils/csvParser';
import { extractNameFromEmail } from '@/lib/utils/nameExtractor';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch((e) => {
      console.error('JSON parse error:', e);
      throw new Error('Invalid JSON in request body');
    });
    
    console.log('Request body:', body);
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
        // CONSERVATIVE APPROACH: Only create publishers for contacts with explicit pricing
        // Get emails and prices from Airtable
        if (!airtableData) {
          result.error = 'No Airtable data found for domain';
          result.requiresManualReview = true;
          break;
        }

        // Get contacts and prices
        const postflowEmails = airtableData.postflowContactEmails;
        const postflowPrices = airtableData.postflowGuestPostPrices;
        const postflowNames = airtableData.postflowContactNames || [];
        
        // Count how many publishers we can create (min of emails and prices)
        const emailsWithPrices: Array<{email: string, price: number, name?: string}> = [];
        
        // Match emails to prices by index (conservative - only where price exists)
        postflowEmails.forEach((email, idx) => {
          const price = postflowPrices[idx];
          if (email && price && price > 0) {
            emailsWithPrices.push({
              email: email.toLowerCase(),
              price: price,
              name: postflowNames[idx] || undefined
            });
          }
        });
        
        // If no postflow data with prices, check guestPostContact with main price
        if (emailsWithPrices.length === 0 && airtableData.guestPostContact && airtableData.guestPostCost && airtableData.guestPostCost > 0) {
          // Only use the FIRST email from guestPostContact
          const firstEmail = airtableData.guestPostContact.split(',')[0].trim().toLowerCase();
          if (firstEmail && firstEmail.includes('@')) {
            emailsWithPrices.push({
              email: firstEmail,
              price: airtableData.guestPostCost
            });
          }
        }
        
        if (emailsWithPrices.length === 0) {
          result.error = 'No contacts with valid pricing found';
          result.requiresManualReview = true;
          result.details = {
            postflowEmails: postflowEmails,
            postflowPrices: postflowPrices,
            guestPostContact: airtableData.guestPostContact,
            guestPostCost: airtableData.guestPostCost
          };
          break;
        }
        
        // Process each email-price pair
        result.publishersCreated = [];
        
        for (const contact of emailsWithPrices) {
          const contactPriceCents = Math.round(contact.price * 100);
          
          // Check if publisher already exists with this email
          const existingPublisher = await db
            .select()
            .from(publishers)
            .where(eq(publishers.email, contact.email))
            .limit(1);

          let publisherId;
          
          if (existingPublisher[0]) {
            // Publisher exists - just link it
            publisherId = existingPublisher[0].id;
            result.operations.push({
              type: 'link_existing_publisher',
              publisherId,
              email: contact.email,
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
                message: `Publisher ${contact.email} already linked to website`
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
                type: 'created_publisher_website_link',
                email: contact.email
              });
            }
          } else {
            // Create new shadow publisher
            const contactName = contact.name || extractNameFromEmail(contact.email);
            
            if (!dryRun) {
              const newPublisher = await db
                .insert(publishers)
                .values({
                  email: contact.email,
                  contactName: contactName,
                  accountStatus: 'shadow',
                  source: 'airtable_import',
                  sourceMetadata: JSON.stringify({ 
                    domain: normalizedDomain,
                    importDate: new Date().toISOString(),
                    airtablePrice: contact.price,
                    originalIndex: emailsWithPrices.indexOf(contact)
                  })
                })
                .returning();
              publisherId = newPublisher[0].id;
            } else {
              publisherId = `DRY_RUN_ID_${emailsWithPrices.indexOf(contact)}`;
            }
            
            result.operations.push({
              type: 'created_shadow_publisher',
              email: contact.email,
              name: contactName,
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
              type: 'created_publisher_website_link',
              email: contact.email
            });
          }

          // Create offering for this publisher
          if (!dryRun) {
            try {
              // Check if offering relationship already exists
              const existingOfferingRel = await db
                .select()
                .from(publisherOfferingRelationships)
                .where(and(
                  eq(publisherOfferingRelationships.publisherId, publisherId),
                  eq(publisherOfferingRelationships.websiteId, website.websiteId)
                ))
                .limit(1);
              
              if (existingOfferingRel[0]) {
                console.log(`Publisher ${contact.email} already has an offering for this website`);
                result.operations.push({
                  type: 'offering_already_exists',
                  email: contact.email,
                  message: 'Publisher already has offering for this website'
                });
              } else {
                console.log(`Creating offering for publisher ${publisherId} at price ${contactPriceCents}`);
                const offering = await db.insert(publisherOfferings).values({
                  publisherId,
                  offeringType: 'guest_post',
                  basePrice: contactPriceCents,
                  currency: 'USD',
                  currentAvailability: 'available',
                  isActive: true
                }).returning();

                console.log(`Created offering ${offering[0].id}`);
                
                // Create offering relationship - only set required fields
                await db.insert(publisherOfferingRelationships).values({
                  publisherId,
                  offeringId: offering[0].id,
                  websiteId: website.websiteId
                });
                
                console.log(`Created offering relationship`);
              
                result.operations.push({
                  type: 'created_offering',
                  offeringId: offering[0].id,
                  email: contact.email,
                  price: contact.price
                });
                result.operations.push({
                  type: 'created_offering_relationship',
                  email: contact.email
                });
              }
            } catch (offeringError) {
              console.error('Failed to create offering:', offeringError);
              result.operations.push({
                type: 'offering_creation_failed',
                error: offeringError instanceof Error ? offeringError.message : 'Unknown error',
                publisherId,
                price: contactPriceCents
              });
              // Continue with other contacts instead of failing entirely
              continue;
            }
          } else {
            result.operations.push({
              type: 'would_create_offering',
              email: contact.email,
              price: contact.price
            });
            result.operations.push({
              type: 'would_create_offering_relationship',
              email: contact.email
            });
          }
          
          result.publishersCreated.push({
            email: contact.email,
            price: contact.price,
            publisherId
          });
        }
        
        // Report any skipped contacts (those without prices)
        const skippedContacts = postflowEmails.slice(emailsWithPrices.length);
        if (skippedContacts.length > 0) {
          result.skippedContacts = skippedContacts;
          result.operations.push({
            type: 'contacts_skipped',
            count: skippedContacts.length,
            reason: 'No pricing data available',
            emails: skippedContacts
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