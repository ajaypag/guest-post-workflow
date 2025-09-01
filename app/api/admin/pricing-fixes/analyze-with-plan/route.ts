import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherWebsites, publisherOfferings, publisherOfferingRelationships, publishers } from '@/lib/db/schema';
import { eq, sql, isNotNull, isNull, and } from 'drizzle-orm';
import { parseAirtableCSV } from '@/lib/utils/csvParser';

export async function GET() {
  try {
    // Parse Airtable data
    const airtableRecords = parseAirtableCSV();
    const airtableMap = new Map(airtableRecords.map(r => [r.domain, r]));
    
    // Get all existing publishers for email matching
    const allPublishers = await db.select().from(publishers);
    const publisherByEmail = new Map(allPublishers.map(p => [p.email.toLowerCase(), p]));
    
    // Get all websites with pricing
    const websitesWithPricing = await db
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
      .where(isNotNull(websites.guestPostCost));

    // Group by website to handle multiple offerings
    const websiteMap = new Map();
    for (const row of websitesWithPricing) {
      const normalizedDomain = row.domain.toLowerCase().replace(/^www\./, '');
      
      if (!websiteMap.has(row.websiteId)) {
        websiteMap.set(row.websiteId, {
          websiteId: row.websiteId,
          domain: normalizedDomain,
          guestPostCost: row.guestPostCost,
          publishers: [],
          offerings: []
        });
      }
      
      const website = websiteMap.get(row.websiteId);
      
      if (row.publisherId && !website.publishers.find((p: any) => p.id === row.publisherId)) {
        website.publishers.push({
          id: row.publisherId,
          name: row.publisherName,
          email: row.publisherEmail,
          status: row.publisherStatus
        });
      }
      
      if (row.offeringId) {
        website.offerings.push({
          id: row.offeringId,
          name: row.offeringName,
          price: row.offeringPrice
        });
      }
    }

    // Analyze issues with detailed execution plans
    const issues = [];
    const stats = {
      total: 0,
      noOffering: 0,
      priceMismatch: 0,
      multipleOfferings: 0,
      noPublisher: 0,
      approved: 0,
      rejected: 0
    };

    for (const [websiteId, data] of websiteMap) {
      const airtableData = airtableMap.get(data.domain);
      const guestPostCostCents = Math.round(data.guestPostCost);
      
      let issue: any = {
        id: websiteId,
        websiteId,
        domain: data.domain,
        currentGuestPostCost: data.guestPostCost,
        currentOfferingPrice: null,
        airtablePrice: airtableData?.guestPostCost || null,
        airtableEmail: airtableData?.postflowContactEmails?.[0] || airtableData?.guestPostContact || null,
        publisherName: data.publishers[0]?.name || null,
        status: 'pending',
        confidence: 'medium',
        executionPlan: []
      };

      // Determine issue type and build execution plan
      if (data.publishers.length === 0) {
        issue.issueType = 'no_publisher';
        
        // Build execution plan for no publisher
        const emails = [
          ...(airtableData?.postflowContactEmails || []),
          airtableData?.guestPostContact
        ].filter(e => e);
        
        if (emails.length > 0) {
          const email = emails[0].toLowerCase();
          const existingPublisher = publisherByEmail.get(email);
          
          if (existingPublisher) {
            // Publisher exists - link it
            issue.executionPlan = [
              {
                step: 1,
                action: 'LINK_EXISTING_PUBLISHER',
                description: `Found existing ${existingPublisher.accountStatus} publisher with email ${email}`,
                details: {
                  publisherId: existingPublisher.id,
                  email: existingPublisher.email,
                  status: existingPublisher.accountStatus
                }
              },
              {
                step: 2,
                action: 'CREATE_PUBLISHER_WEBSITE_LINK',
                description: 'Link publisher to website in publisher_websites table',
                details: {
                  table: 'publisher_websites',
                  fields: {
                    publisherId: existingPublisher.id,
                    websiteId: websiteId,
                    canEditPricing: true,
                    canEditAvailability: true,
                    canViewAnalytics: true,
                    status: 'active'
                  }
                }
              },
              {
                step: 3,
                action: 'CREATE_OFFERING',
                description: 'Create new offering in publisher_offerings table',
                details: {
                  table: 'publisher_offerings',
                  fields: {
                    publisherId: existingPublisher.id,
                    offeringType: 'guest_post',
                    basePrice: guestPostCostCents,
                    currency: 'USD',
                    currentAvailability: 'available',
                    isActive: true
                  }
                }
              },
              {
                step: 4,
                action: 'CREATE_OFFERING_RELATIONSHIP',
                description: 'Link offering to website in publisher_offering_relationships table',
                details: {
                  table: 'publisher_offering_relationships',
                  fields: {
                    publisherId: existingPublisher.id,
                    offeringId: '[Generated from step 3]',
                    websiteId: websiteId
                  },
                  defaults: {
                    isPrimary: false,
                    isActive: true,
                    relationshipType: 'contact',
                    verificationStatus: 'claimed'
                  }
                }
              },
              {
                step: 5,
                action: 'UPDATE_GUEST_POST_COST',
                description: 'Update websites.guest_post_cost to match',
                details: {
                  table: 'websites',
                  set: {
                    guest_post_cost: airtableData?.guestPostCost || data.guestPostCost
                  }
                }
              }
            ];
            issue.confidence = 'high';
          } else {
            // Need to create shadow publisher
            issue.executionPlan = [
              {
                step: 1,
                action: 'CREATE_SHADOW_PUBLISHER',
                description: `Create new shadow publisher with email ${email}`,
                details: {
                  table: 'publishers',
                  fields: {
                    email: email,
                    contactName: 'Unknown',
                    accountStatus: 'shadow',
                    source: 'airtable_import',
                    sourceMetadata: {
                      domain: data.domain,
                      importDate: new Date().toISOString(),
                      airtablePrice: airtableData?.guestPostCost
                    }
                  }
                }
              },
              {
                step: 2,
                action: 'CREATE_PUBLISHER_WEBSITE_LINK',
                description: 'Link new publisher to website',
                details: {
                  table: 'publisher_websites',
                  fields: {
                    publisherId: '[Generated from step 1]',
                    websiteId: websiteId,
                    canEditPricing: true,
                    canEditAvailability: true,
                    canViewAnalytics: true,
                    status: 'active'
                  }
                }
              },
              {
                step: 3,
                action: 'CREATE_OFFERING',
                description: 'Create new offering',
                details: {
                  table: 'publisher_offerings',
                  fields: {
                    publisherId: '[Generated from step 1]',
                    offeringType: 'guest_post',
                    basePrice: guestPostCostCents,
                    currency: 'USD',
                    currentAvailability: 'available',
                    isActive: true
                  }
                }
              },
              {
                step: 4,
                action: 'CREATE_OFFERING_RELATIONSHIP',
                description: 'Link offering to website',
                details: {
                  table: 'publisher_offering_relationships',
                  fields: {
                    publisherId: '[Generated from step 1]',
                    offeringId: '[Generated from step 3]',
                    websiteId: websiteId
                  },
                  defaults: {
                    isPrimary: false,
                    isActive: true,
                    relationshipType: 'contact',
                    verificationStatus: 'claimed'
                  }
                }
              },
              {
                step: 5,
                action: 'UPDATE_GUEST_POST_COST',
                description: 'Update websites.guest_post_cost to match',
                details: {
                  table: 'websites',
                  set: {
                    guest_post_cost: airtableData?.guestPostCost || data.guestPostCost
                  }
                }
              }
            ];
            issue.confidence = airtableData ? 'high' : 'medium';
          }
        } else {
          issue.executionPlan = [
            {
              step: 1,
              action: 'MANUAL_REVIEW_REQUIRED',
              description: 'No email found in Airtable data - cannot create publisher',
              details: {
                reason: 'Missing contact email',
                suggestion: 'Manually add publisher or find contact email'
              }
            }
          ];
          issue.confidence = 'low';
        }
        
        issue.proposedAction = issue.executionPlan[0].description;
        issue.proposedPrice = airtableData?.guestPostCost || data.guestPostCost;
        stats.noPublisher++;
        
      } else if (data.offerings.length === 0) {
        issue.issueType = 'no_offering';
        issue.currentOfferingPrice = null;
        
        const publisher = data.publishers[0];
        issue.executionPlan = [
          {
            step: 1,
            action: 'CREATE_OFFERING',
            description: `Create offering for existing ${publisher.status} publisher`,
            details: {
              table: 'publisher_offerings',
              fields: {
                publisherId: publisher.id,
                offeringType: 'guest_post',
                basePrice: guestPostCostCents,
                currency: 'USD',
                currentAvailability: 'available',
                isActive: true
              }
            }
          },
          {
            step: 2,
            action: 'CREATE_OFFERING_RELATIONSHIP',
            description: 'Link offering to website',
            details: {
              table: 'publisher_offering_relationships',
              fields: {
                publisherId: publisher.id,
                offeringId: '[Generated from step 1]',
                websiteId: websiteId
              },
              defaults: {
                isPrimary: false,
                isActive: true,
                relationshipType: 'contact',
                verificationStatus: 'claimed'
              }
            }
          },
          {
            step: 3,
            action: 'UPDATE_GUEST_POST_COST',
            description: 'Ensure websites.guest_post_cost matches',
            details: {
              table: 'websites',
              set: {
                guest_post_cost: airtableData?.guestPostCost || data.guestPostCost
              }
            }
          }
        ];
        
        issue.proposedAction = 'Create offering with price from Airtable';
        issue.proposedPrice = airtableData?.guestPostCost || data.guestPostCost;
        issue.confidence = airtableData ? 'high' : 'medium';
        stats.noOffering++;
        
      } else if (data.offerings.length > 1) {
        issue.issueType = 'multiple_offerings';
        issue.currentOfferingPrice = data.offerings[0].price;
        
        issue.executionPlan = [
          {
            step: 1,
            action: 'MANUAL_REVIEW_REQUIRED',
            description: `Website has ${data.offerings.length} offerings - needs human decision`,
            details: {
              offerings: data.offerings.map((o: any) => ({
                id: o.id,
                name: o.name,
                price: o.price / 100
              })),
              suggestion: 'Determine which offering to keep, archive others'
            }
          }
        ];
        
        issue.proposedAction = 'Manual review required for multiple offerings';
        issue.proposedPrice = airtableData?.guestPostCost || data.guestPostCost;
        issue.confidence = 'low';
        stats.multipleOfferings++;
        
      } else {
        // Single offering - check price match
        const offering = data.offerings[0];
        issue.currentOfferingPrice = offering.price;
        
        if (offering.price !== guestPostCostCents) {
          issue.issueType = 'price_mismatch';
          issue.priceDifference = (offering.price - guestPostCostCents) / 100;
          
          issue.executionPlan = [
            {
              step: 1,
              action: 'UPDATE_OFFERING_PRICE',
              description: `Update offering price from $${offering.price/100} to $${data.guestPostCost}`,
              details: {
                table: 'publisher_offerings',
                where: {
                  id: offering.id
                },
                set: {
                  basePrice: guestPostCostCents,
                  updatedAt: 'CURRENT_TIMESTAMP'
                }
              }
            },
            {
              step: 2,
              action: 'UPDATE_GUEST_POST_COST',
              description: 'Ensure websites.guest_post_cost matches',
              details: {
                table: 'websites',
                set: {
                  guest_post_cost: airtableData?.guestPostCost || data.guestPostCost
                }
              }
            }
          ];
          
          // Use Airtable as source of truth if available
          if (airtableData?.guestPostCost) {
            issue.proposedPrice = airtableData.guestPostCost;
            issue.proposedAction = `Update offering price to match Airtable ($${airtableData.guestPostCost})`;
            issue.confidence = 'high';
          } else {
            issue.proposedPrice = data.guestPostCost;
            issue.proposedAction = `Update offering price to match guest_post_cost ($${data.guestPostCost})`;
            issue.confidence = 'medium';
          }
          
          // Adjust confidence based on difference
          if (Math.abs(issue.priceDifference) < 10) {
            issue.confidence = 'high';
          } else if (Math.abs(issue.priceDifference) > 50) {
            issue.confidence = 'low';
          }
          
          stats.priceMismatch++;
        } else {
          continue; // No issue, prices match
        }
      }

      issues.push(issue);
      stats.total++;
    }

    // Sort issues by confidence and type
    issues.sort((a, b) => {
      const confidenceOrder = { high: 0, medium: 1, low: 2 };
      const typeOrder = { no_publisher: 0, no_offering: 1, price_mismatch: 2, multiple_offerings: 3 };
      
      if (a.confidence !== b.confidence) {
        return confidenceOrder[a.confidence as keyof typeof confidenceOrder] - 
               confidenceOrder[b.confidence as keyof typeof confidenceOrder];
      }
      
      return typeOrder[a.issueType as keyof typeof typeOrder] - 
             typeOrder[b.issueType as keyof typeof typeOrder];
    });

    return NextResponse.json({ issues, stats });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze pricing issues' },
      { status: 500 }
    );
  }
}