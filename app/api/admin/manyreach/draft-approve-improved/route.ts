import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers, publisherWebsites } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { eq, and, sql } from 'drizzle-orm';

interface ApprovalResult {
  success: boolean;
  draftId: string;
  created: {
    publisherId?: string;
    websiteIds: string[];
    offeringIds: string[];
    relationshipIds: string[];
  };
  updated: {
    publisherUpdated: boolean;
    websitesUpdated: string[];
    offeringsUpdated: string[];
  };
  skipped: {
    duplicateOfferings: number;
    priceConflicts: number;
    existingRelationships: number;
  };
  priceConflicts: Array<{
    offeringType: string;
    domain: string;
    existingPrice: number;
    newPrice: number;
    action: 'skipped' | 'updated' | 'flagged';
  }>;
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { draftId, forceResolveConflicts = false } = await request.json();
    
    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    console.log(`✅ Approving draft ${draftId} with improved duplicate detection...`);
    
    // Get the draft with parsed data
    const draftResult = await db.execute(sql`
      SELECT 
        d.id,
        d.parsed_data,
        d.edited_data,
        d.status,
        d.publisher_id,
        d.website_id,
        el.email_from,
        el.campaign_id,
        el.id as email_log_id
      FROM publisher_drafts d
      LEFT JOIN email_processing_logs el ON d.email_log_id = el.id
      WHERE d.id = ${draftId}
      LIMIT 1
    `);
    
    if (!draftResult.rows || draftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    
    const draft = draftResult.rows[0] as any;
    
    // Log status but allow re-processing for improved duplicate detection
    if (draft.status === 'approved') {
      console.log(`ℹ️ Re-processing already approved draft ${draftId} with improved system`);
    }
    
    // Merge edited data over parsed data
    const parsedData = typeof draft.parsed_data === 'string' 
      ? JSON.parse(draft.parsed_data || '{}')
      : draft.parsed_data || {};
    
    const editedData = draft.edited_data 
      ? (typeof draft.edited_data === 'string' ? JSON.parse(draft.edited_data) : draft.edited_data)
      : {};
    
    const finalData = {
      ...parsedData,
      ...editedData
    };
    
    if (!finalData.hasOffer) {
      return NextResponse.json({ 
        error: 'Draft has no offer to process',
        finalData 
      }, { status: 400 });
    }

    const result: ApprovalResult = {
      success: false,
      draftId,
      created: {
        websiteIds: [],
        offeringIds: [],
        relationshipIds: []
      },
      updated: {
        publisherUpdated: false,
        websitesUpdated: [],
        offeringsUpdated: []
      },
      skipped: {
        duplicateOfferings: 0,
        priceConflicts: 0,
        existingRelationships: 0
      },
      priceConflicts: [],
      errors: []
    };

    try {
      // 1. CREATE OR UPDATE PUBLISHER
      let publisherId: string | undefined;
      
      if (finalData.publisher?.email) {
        const existingPublisher = await db
          .select()
          .from(publishers)
          .where(eq(publishers.email, finalData.publisher.email))
          .limit(1);
        
        if (existingPublisher.length > 0) {
          publisherId = existingPublisher[0].id;
          console.log(`📝 Updating existing publisher: ${publisherId}`);
          
          // Only update if we have new data
          const hasUpdates = 
            (finalData.publisher.contactName && finalData.publisher.contactName !== existingPublisher[0].contactName) ||
            (finalData.publisher.companyName && finalData.publisher.companyName !== existingPublisher[0].companyName) ||
            (finalData.publisher.phone && finalData.publisher.phone !== existingPublisher[0].phone) ||
            (finalData.publisher.paymentEmail && finalData.publisher.paymentEmail !== existingPublisher[0].paymentEmail) ||
            (finalData.publisher.paymentMethods?.length && finalData.publisher.paymentMethods[0] !== existingPublisher[0].paymentMethod);
          
          if (hasUpdates) {
            await db.update(publishers)
              .set({
                contactName: finalData.publisher.contactName || existingPublisher[0].contactName,
                companyName: finalData.publisher.companyName || existingPublisher[0].companyName,
                phone: finalData.publisher.phone || existingPublisher[0].phone,
                paymentEmail: finalData.publisher.paymentEmail || existingPublisher[0].paymentEmail,
                ...(finalData.publisher.paymentMethods?.length && {
                  paymentMethod: finalData.publisher.paymentMethods[0]
                }),
                updatedAt: new Date()
              })
              .where(eq(publishers.id, publisherId));
            
            result.updated.publisherUpdated = true;
            console.log(`✅ Publisher updated with new information`);
          } else {
            console.log(`ℹ️ Publisher exists, no updates needed`);
          }
            
        } else {
          console.log(`🆕 Creating new shadow publisher: ${finalData.publisher.email}`);
          
          const newPublisher = await db.insert(publishers)
            .values({
              id: crypto.randomUUID(),
              email: finalData.publisher.email,
              contactName: finalData.publisher.contactName || finalData.publisher.email.split('@')[0],
              companyName: finalData.publisher.companyName,
              phone: finalData.publisher.phone,
              paymentEmail: finalData.publisher.paymentEmail,
              paymentMethod: finalData.publisher.paymentMethods?.[0] || 'paypal',
              accountStatus: 'shadow',
              source: 'manyreach',
              sourceMetadata: JSON.stringify({
                draftId,
                emailLogId: draft.email_log_id,
                campaignId: draft.campaign_id,
                extractedAt: new Date().toISOString()
              }),
              confidenceScore: finalData.extractionMetadata?.confidence || '0.8',
              status: 'pending'
            })
            .returning();
          
          publisherId = newPublisher[0].id;
        }
        
        result.created.publisherId = publisherId;
      } else {
        result.errors.push('No publisher email found - cannot create publisher');
        return NextResponse.json(result, { status: 400 });
      }

      // 2. CREATE OR MATCH WEBSITES
      const websiteIdMap: Record<string, string> = {};
      
      if (finalData.websites && Array.isArray(finalData.websites)) {
        for (const websiteData of finalData.websites) {
          const normalizedDomain = normalizeDomain(websiteData.domain);
          
          const existingWebsite = await db
            .select()
            .from(websites)
            .where(eq(websites.domain, normalizedDomain))
            .limit(1);
          
          let websiteId: string;
          
          if (existingWebsite.length > 0) {
            websiteId = existingWebsite[0].id;
            console.log(`✅ Found existing website: ${normalizedDomain}`);
            
            // Update categories/niches if new ones found
            const existingCategories = existingWebsite[0].categories || [];
            const existingNiches = existingWebsite[0].niche || [];
            const newCategories = websiteData.categories || [];
            const newNiches = websiteData.niche || [];
            const suggestedNewNiches = websiteData.suggestedNewNiches || [];
            
            // Process suggested new niches - create them if they don't exist
            const processedNewNiches: string[] = [];
            if (suggestedNewNiches.length > 0) {
              console.log(`🔍 Processing ${suggestedNewNiches.length} suggested new niches for ${normalizedDomain}`);
              
              for (const suggestedNiche of suggestedNewNiches) {
                // Check if this niche already exists in the niches table (case-insensitive)
                const existingNicheRecord = await db.sql`
                  SELECT name FROM niches 
                  WHERE LOWER(name) = LOWER(${suggestedNiche})
                  LIMIT 1
                `;
                
                if (existingNicheRecord.length === 0) {
                  // Create the new niche
                  console.log(`🆕 Creating new niche: ${suggestedNiche}`);
                  await db.sql`
                    INSERT INTO niches (name, source, created_at)
                    VALUES (${suggestedNiche}, 'manyreach_ai', NOW())
                    ON CONFLICT (LOWER(name)) DO NOTHING
                  `;
                  processedNewNiches.push(suggestedNiche);
                } else {
                  // Use the existing niche name (maintains case from database)
                  processedNewNiches.push(existingNicheRecord[0].name);
                }
              }
            }
            
            // Merge all niches together
            const allNiches = [...new Set([...existingNiches, ...newNiches, ...processedNewNiches])];
            const hasNewCategories = newCategories.some((cat: string) => !existingCategories.includes(cat));
            const hasNewNiches = allNiches.length > existingNiches.length;
            
            if (hasNewCategories || hasNewNiches) {
              const mergedCategories = [...new Set([...existingCategories, ...newCategories])];
              await db.update(websites)
                .set({
                  categories: mergedCategories,
                  niche: allNiches,
                  updatedAt: new Date()
                })
                .where(eq(websites.id, websiteId));
              
              result.updated.websitesUpdated.push(websiteId);
              console.log(`✅ Updated website categories/niches: ${normalizedDomain}`);
              if (processedNewNiches.length > 0) {
                console.log(`   Added new niches: ${processedNewNiches.join(', ')}`);
              }
            }
          } else {
            console.log(`🆕 Creating new website: ${normalizedDomain}`);
            
            // Process suggested new niches for new website
            const suggestedNewNiches = websiteData.suggestedNewNiches || [];
            const processedNewNiches: string[] = [];
            
            if (suggestedNewNiches.length > 0) {
              console.log(`🔍 Processing ${suggestedNewNiches.length} suggested new niches for new website ${normalizedDomain}`);
              
              for (const suggestedNiche of suggestedNewNiches) {
                // Check if this niche already exists in the niches table (case-insensitive)
                const existingNicheRecord = await db.sql`
                  SELECT name FROM niches 
                  WHERE LOWER(name) = LOWER(${suggestedNiche})
                  LIMIT 1
                `;
                
                if (existingNicheRecord.length === 0) {
                  // Create the new niche
                  console.log(`🆕 Creating new niche: ${suggestedNiche}`);
                  await db.sql`
                    INSERT INTO niches (name, source, created_at)
                    VALUES (${suggestedNiche}, 'manyreach_ai', NOW())
                    ON CONFLICT (LOWER(name)) DO NOTHING
                  `;
                  processedNewNiches.push(suggestedNiche);
                } else {
                  // Use the existing niche name (maintains case from database)
                  processedNewNiches.push(existingNicheRecord[0].name);
                }
              }
            }
            
            // Combine existing niches with newly created ones
            const allNiches = [...new Set([...(websiteData.niche || []), ...processedNewNiches])];
            
            const newWebsite = await db.insert(websites)
              .values({
                id: crypto.randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
                domain: normalizedDomain,
                categories: websiteData.categories || [],
                niche: allNiches,
                websiteType: websiteData.websiteType || [],
                domainRating: websiteData.domainRating,
                internalNotes: websiteData.internalNotes,
                status: 'active',
                source: 'manyreach',
                importedAt: new Date()
              })
              .returning();
            
            websiteId = newWebsite[0].id;
            result.created.websiteIds.push(websiteId);
          }
          
          websiteIdMap[normalizedDomain] = websiteId;
          
          // Create publisher-website relationship if it doesn't exist
          const existingRelationship = await db
            .select()
            .from(publisherWebsites)
            .where(and(
              eq(publisherWebsites.publisherId, publisherId!),
              eq(publisherWebsites.websiteId, websiteId)
            ))
            .limit(1);
          
          if (existingRelationship.length === 0) {
            console.log(`🔗 Creating publisher-website relationship`);
            const newRel = await db.insert(publisherWebsites)
              .values({
                id: crypto.randomUUID(),
                publisherId: publisherId!,
                websiteId: websiteId,
                status: 'active'
              })
              .returning();
            
            result.created.relationshipIds.push(newRel[0].id);
          } else {
            result.skipped.existingRelationships++;
            console.log(`ℹ️ Publisher-website relationship already exists`);
          }
        }
      }

      // 3. IMPROVED OFFERING CREATION WITH DUPLICATE DETECTION
      if (finalData.offerings && Array.isArray(finalData.offerings)) {
        for (const offering of finalData.offerings) {
          if (!offering.websiteDomain) {
            result.errors.push(`Offering of type ${offering.offeringType} has no website domain`);
            continue;
          }
          
          const normalizedDomain = normalizeDomain(offering.websiteDomain);
          const websiteId = websiteIdMap[normalizedDomain];
          
          if (!websiteId) {
            result.errors.push(`Website ${offering.websiteDomain} not found for offering`);
            continue;
          }
          
          // Check for existing similar offerings
          const existingOfferingsResult = await db
            .select()
            .from(publisherOfferings)
            .innerJoin(
              publisherOfferingRelationships,
              eq(publisherOfferings.id, publisherOfferingRelationships.offeringId)
            )
            .where(and(
              eq(publisherOfferings.publisherId, publisherId!),
              eq(publisherOfferingRelationships.websiteId, websiteId),
              eq(publisherOfferings.offeringType, offering.offeringType),
              eq(publisherOfferings.isActive, true)
            ))
            .limit(1);
          
          const newPrice = offering.basePrice ? Math.round(offering.basePrice * 100) : null;
          
          if (existingOfferingsResult.length > 0) {
            const existingOffering = existingOfferingsResult[0].publisher_offerings;
            const existingPrice = existingOffering.basePrice;
            
            // Handle price conflicts
            if (newPrice && existingPrice && newPrice !== existingPrice) {
              const priceDifference = newPrice - existingPrice;
              const percentageChange = Math.round((priceDifference / existingPrice) * 100);
              
              // Flag significant price changes (>10% or >$50)
              const significantChange = Math.abs(percentageChange) > 10 || Math.abs(priceDifference) > 5000;
              
              const conflictInfo = {
                offeringType: offering.offeringType,
                domain: normalizedDomain,
                existingPrice,
                newPrice,
                action: 'skipped' as const
              };
              
              if (significantChange && !forceResolveConflicts) {
                // Skip significant price changes unless forced
                result.priceConflicts.push({ ...conflictInfo, action: 'skipped' });
                result.skipped.priceConflicts++;
                console.log(`⚠️ Skipping price conflict: ${offering.offeringType} on ${normalizedDomain} - ${percentageChange}% change`);
                continue;
              } else {
                // Update price for minor changes or when forced
                await db.update(publisherOfferings)
                  .set({
                    basePrice: newPrice,
                    currency: offering.currency || existingOffering.currency,
                    turnaroundDays: offering.turnaroundDays || existingOffering.turnaroundDays,
                    minWordCount: offering.minWordCount || existingOffering.minWordCount,
                    maxWordCount: offering.maxWordCount || existingOffering.maxWordCount,
                    attributes: {
                      ...(existingOffering.attributes || {}),
                      requirements: offering.requirements,
                      originalExtraction: offering,
                      lastUpdated: new Date().toISOString()
                    }
                  })
                  .where(eq(publisherOfferings.id, existingOffering.id));
                
                result.updated.offeringsUpdated.push(existingOffering.id);
                result.priceConflicts.push({ ...conflictInfo, action: 'updated' });
                console.log(`✅ Updated offering price: ${offering.offeringType} on ${normalizedDomain}`);
              }
            } else if (newPrice === existingPrice || !newPrice) {
              // Exact duplicate - skip
              result.skipped.duplicateOfferings++;
              console.log(`ℹ️ Skipping duplicate offering: ${offering.offeringType} on ${normalizedDomain}`);
              continue;
            } else if (!existingPrice && newPrice) {
              // Add price to existing offering that had no price
              await db.update(publisherOfferings)
                .set({
                  basePrice: newPrice,
                  currency: offering.currency || 'USD',
                  currentAvailability: 'available'
                })
                .where(eq(publisherOfferings.id, existingOffering.id));
              
              result.updated.offeringsUpdated.push(existingOffering.id);
              console.log(`✅ Added price to existing offering: ${offering.offeringType} on ${normalizedDomain}`);
            }
          } else {
            // Create new offering
            console.log(`💰 Creating new offering: ${offering.offeringType} for ${normalizedDomain}`);
            
            // Get email content for tracking
            let emailContent = null;
            let pricingSnippet = null;
            
            if (draft.email_log_id) {
              const emailLog = await db
                .select({
                  htmlContent: emailProcessingLogs.htmlContent,
                  rawContent: emailProcessingLogs.rawContent
                })
                .from(emailProcessingLogs)
                .where(eq(emailProcessingLogs.id, draft.email_log_id))
                .limit(1);
              
              if (emailLog[0]) {
                emailContent = emailLog[0].htmlContent || emailLog[0].rawContent;
                
                if (parsedData.extractionMetadata?.pricingSource) {
                  pricingSnippet = parsedData.extractionMetadata.pricingSource;
                } else if (emailContent && newPrice) {
                  const pricePatterns = [
                    new RegExp(`\\$${offering.basePrice}[\\s\\S]{0,100}`, 'i'),
                    new RegExp(`[\\s\\S]{0,100}\\$${offering.basePrice}`, 'i'),
                    new RegExp(`${offering.basePrice}[\\s\\S]{0,100}`, 'i')
                  ];
                  
                  for (const pattern of pricePatterns) {
                    const match = emailContent.match(pattern);
                    if (match) {
                      pricingSnippet = match[0].substring(0, 500);
                      break;
                    }
                  }
                }
              }
            }
            
            const hasValidPrice = newPrice !== null && newPrice !== undefined;
            const availability = hasValidPrice ? 'available' : 'needs_info';
            
            const newOffering = await db.insert(publisherOfferings)
              .values({
                id: crypto.randomUUID(),
                publisherId: publisherId!,
                offeringType: offering.offeringType,
                basePrice: newPrice,
                currency: offering.currency || 'USD',
                turnaroundDays: offering.turnaroundDays || null,
                currentAvailability: availability,
                expressAvailable: false,
                expressPrice: null as any,
                expressDays: null as any,
                offeringName: null as any,
                minWordCount: offering.minWordCount || null,
                maxWordCount: offering.maxWordCount || null,
                niches: null as any,
                languages: ['en'],
                attributes: {
                  requirements: offering.requirements,
                  originalExtraction: offering,
                  dataCompleteness: hasValidPrice ? 'complete' : 'needs_pricing',
                  followUpRequired: !hasValidPrice,
                  extractedInfo: !hasValidPrice ? 'Publisher mentioned fees but no specific price provided' : null
                },
                isActive: true,
                sourceEmailId: draft.email_log_id || null,
                sourceEmailContent: emailContent as any,
                pricingExtractedFrom: pricingSnippet as any
              })
              .returning();
            
            const offeringId = newOffering[0].id;
            result.created.offeringIds.push(offeringId);
            
            // Create offering relationship
            const newRelationship = await db.insert(publisherOfferingRelationships)
              .values({
                id: crypto.randomUUID(),
                publisherId: publisherId!,
                websiteId: websiteId,
                offeringId: offeringId,
                relationshipType: 'contact',
                verificationStatus: 'claimed',
                contactEmail: finalData.publisher.email,
                contactName: finalData.publisher.contactName,
                isActive: true
              })
              .returning();
            
            result.created.relationshipIds.push(newRelationship[0].id);
            console.log(`✅ Created relationship for ${offering.offeringType} offering`);
          }
        }
      }

      // 4. UPDATE DRAFT STATUS
      await db.execute(sql`
        UPDATE publisher_drafts
        SET 
          status = 'approved',
          publisher_id = ${publisherId},
          website_id = ${result.created.websiteIds[0] || null},
          reviewed_at = NOW(),
          updated_at = NOW()
        WHERE id = ${draftId}
      `);
      
      result.success = true;
      
      console.log(`✅ Improved draft approval complete!`);
      console.log(`   Publisher: ${publisherId} ${result.updated.publisherUpdated ? '(updated)' : '(created/existing)'}`);
      console.log(`   Websites: ${result.created.websiteIds.length} created, ${result.updated.websitesUpdated.length} updated`);
      console.log(`   Offerings: ${result.created.offeringIds.length} created, ${result.updated.offeringsUpdated.length} updated`);
      console.log(`   Skipped: ${result.skipped.duplicateOfferings} duplicates, ${result.skipped.priceConflicts} conflicts`);
      console.log(`   Relationships: ${result.created.relationshipIds.length} created, ${result.skipped.existingRelationships} existing`);
      
      return NextResponse.json(result);
      
    } catch (error) {
      console.error('Error during improved approval transaction:', error);
      if (error instanceof Error && 'code' in error) {
        console.error('Database error code:', (error as any).code);
        console.error('Database error detail:', (error as any).detail);
      }
      result.errors.push(error instanceof Error ? error.message : 'Transaction failed');
      return NextResponse.json(result, { status: 500 });
    }
    
  } catch (error) {
    console.error('Improved draft approval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Approval failed' },
      { status: 500 }
    );
  }
}

// Helper function to normalize domain
function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/^www\./, '') // Remove www
    .replace(/\/$/, '') // Remove trailing slash
    .trim();
}