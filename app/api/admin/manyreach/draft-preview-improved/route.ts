import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers, publisherWebsites } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and, sql } from 'drizzle-orm';

interface PreviewResult {
  draftId: string;
  currentState: {
    publisher?: any;
    websites: any[];
    offerings: any[];
    relationships: any[];
  };
  proposedActions: {
    publisherAction: 'create' | 'update' | 'skip';
    publisherDetails?: any;
    websiteActions: Array<{
      action: 'create' | 'exists' | 'update';
      domain: string;
      details?: any;
      existingWebsite?: any;
    }>;
    offeringActions: Array<{
      action: 'create' | 'update' | 'skip' | 'price_conflict';
      type: string;
      websiteDomain: string;
      details?: any;
      existingOffering?: any;
      priceConflict?: {
        existingPrice: number;
        newPrice: number;
        priceDifference: number;
        percentageChange: number;
      };
    }>;
    relationshipActions: Array<{
      action: 'create' | 'exists' | 'update';
      publisherEmail: string;
      websiteDomain: string;
      existingRelationship?: any;
    }>;
  };
  warnings: string[];
  estimatedImpact: {
    newPublishers: number;
    newWebsites: number;
    newOfferings: number;
    updatedRecords: number;
    priceConflicts: number;
    skippedDuplicates: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { draftId } = await request.json();
    
    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    console.log(`🔍 Generating improved preview for draft ${draftId}...`);
    
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
        el.campaign_id
      FROM publisher_drafts d
      LEFT JOIN email_processing_logs el ON d.email_log_id = el.id
      WHERE d.id = ${draftId}
      LIMIT 1
    `);
    
    if (!draftResult.rows || draftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    
    const draft = draftResult.rows[0] as any;
    
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

    const preview: PreviewResult = {
      draftId,
      currentState: {
        publisher: undefined,
        websites: [],
        offerings: [],
        relationships: []
      },
      proposedActions: {
        publisherAction: 'skip',
        websiteActions: [],
        offeringActions: [],
        relationshipActions: []
      },
      warnings: [],
      estimatedImpact: {
        newPublishers: 0,
        newWebsites: 0,
        newOfferings: 0,
        updatedRecords: 0,
        priceConflicts: 0,
        skippedDuplicates: 0
      }
    };

    let publisherId: string | undefined;

    // 1. CHECK PUBLISHER
    if (finalData.publisher?.email) {
      const existingPublisher = await db
        .select()
        .from(publishers)
        .where(eq(publishers.email, finalData.publisher.email))
        .limit(1);
      
      if (existingPublisher.length > 0) {
        publisherId = existingPublisher[0].id;
        preview.currentState.publisher = existingPublisher[0];
        preview.proposedActions.publisherAction = 'update';
        preview.proposedActions.publisherDetails = {
          id: existingPublisher[0].id,
          currentEmail: existingPublisher[0].email,
          updates: {
            contactName: finalData.publisher.contactName || existingPublisher[0].contactName,
            companyName: finalData.publisher.companyName || existingPublisher[0].companyName,
            phone: finalData.publisher.phone || existingPublisher[0].phone,
            paymentEmail: finalData.publisher.paymentEmail || existingPublisher[0].paymentEmail,
            ...(finalData.publisher.paymentMethods?.length && {
              paymentMethod: finalData.publisher.paymentMethods[0]
            })
          }
        };
        preview.estimatedImpact.updatedRecords++;
        
        if (existingPublisher[0].accountStatus === 'active') {
          preview.warnings.push(`Publisher ${finalData.publisher.email} is already active - updates will be minimal`);
        }
      } else {
        preview.proposedActions.publisherAction = 'create';
        preview.proposedActions.publisherDetails = {
          email: finalData.publisher.email,
          contactName: finalData.publisher.contactName || finalData.publisher.email.split('@')[0],
          companyName: finalData.publisher.companyName,
          phone: finalData.publisher.phone,
          paymentEmail: finalData.publisher.paymentEmail,
          paymentMethod: finalData.publisher.paymentMethods?.[0] || 'paypal',
          accountStatus: 'shadow',
          source: 'manyreach'
        };
        preview.estimatedImpact.newPublishers++;
      }
    } else {
      preview.warnings.push('No publisher email found - cannot create publisher record');
    }

    // 2. CHECK WEBSITES
    const websiteIdMap: Record<string, string> = {};
    
    if (finalData.websites && Array.isArray(finalData.websites)) {
      for (const websiteData of finalData.websites) {
        const normalizedDomain = normalizeDomain(websiteData.domain);
        
        // Check if website exists
        const existingWebsite = await db
          .select()
          .from(websites)
          .where(eq(websites.domain, normalizedDomain))
          .limit(1);
        
        if (existingWebsite.length > 0) {
          websiteIdMap[normalizedDomain] = existingWebsite[0].id;
          preview.currentState.websites.push(existingWebsite[0]);
          
          const existingCategories = existingWebsite[0].categories || [];
          const newCategories = websiteData.categories || [];
          const hasNewCategories = newCategories.some((cat: string) => !existingCategories.includes(cat));
          
          preview.proposedActions.websiteActions.push({
            action: hasNewCategories ? 'update' : 'exists',
            domain: normalizedDomain,
            existingWebsite: existingWebsite[0],
            ...(hasNewCategories && {
              details: {
                addCategories: newCategories.filter((cat: string) => !existingCategories.includes(cat))
              }
            })
          });
          
          if (hasNewCategories) {
            preview.estimatedImpact.updatedRecords++;
          }
        } else {
          preview.proposedActions.websiteActions.push({
            action: 'create',
            domain: normalizedDomain,
            details: {
              categories: websiteData.categories,
              niche: websiteData.niche,
              suggestedNewNiches: websiteData.suggestedNewNiches,
              websiteType: websiteData.websiteType,
              domainRating: websiteData.domainRating
            }
          });
          preview.estimatedImpact.newWebsites++;
        }
      }
    }

    // 3. IMPROVED OFFERING DUPLICATE DETECTION
    if (finalData.offerings && Array.isArray(finalData.offerings)) {
      for (const offering of finalData.offerings) {
        if (!offering.websiteDomain) {
          preview.warnings.push(`Offering of type ${offering.offeringType} has no website domain - will be skipped`);
          continue;
        }
        
        const normalizedDomain = normalizeDomain(offering.websiteDomain);
        const websiteId = websiteIdMap[normalizedDomain];
        
        // Check if website exists or will be created
        const websiteAction = preview.proposedActions.websiteActions.find(w => w.domain === normalizedDomain);
        if (!websiteAction) {
          preview.warnings.push(`Offering for ${offering.websiteDomain} - website not found, will be skipped`);
          preview.proposedActions.offeringActions.push({
            action: 'skip',
            type: offering.offeringType,
            websiteDomain: normalizedDomain,
            details: { reason: 'Website not found' }
          });
          continue;
        }
        
        // Check for existing similar offerings
        let existingOffering = null;
        if (publisherId && websiteId) {
          const existingOfferingsResult = await db
            .select()
            .from(publisherOfferings)
            .innerJoin(
              publisherOfferingRelationships,
              eq(publisherOfferings.id, publisherOfferingRelationships.offeringId)
            )
            .where(and(
              eq(publisherOfferings.publisherId, publisherId),
              eq(publisherOfferingRelationships.websiteId, websiteId),
              eq(publisherOfferings.offeringType, offering.offeringType),
              eq(publisherOfferings.isActive, true)
            ))
            .limit(1);
          
          if (existingOfferingsResult.length > 0) {
            existingOffering = existingOfferingsResult[0].publisher_offerings;
            preview.currentState.offerings.push(existingOffering);
          }
        }
        
        if (existingOffering) {
          // Check for price conflicts
          const newPrice = offering.basePrice ? Math.round(offering.basePrice * 100) : null;
          const existingPrice = existingOffering.basePrice;
          
          if (newPrice && existingPrice && newPrice !== existingPrice) {
            const priceDifference = newPrice - existingPrice;
            const percentageChange = Math.round((priceDifference / existingPrice) * 100);
            
            // Flag significant price changes (>10% or >$50)
            const significantChange = Math.abs(percentageChange) > 10 || Math.abs(priceDifference) > 5000;
            
            preview.proposedActions.offeringActions.push({
              action: significantChange ? 'price_conflict' : 'update',
              type: offering.offeringType,
              websiteDomain: normalizedDomain,
              existingOffering,
              priceConflict: {
                existingPrice: existingPrice,
                newPrice: newPrice,
                priceDifference: priceDifference,
                percentageChange: percentageChange
              },
              details: offering
            });
            
            if (significantChange) {
              preview.estimatedImpact.priceConflicts++;
              preview.warnings.push(
                `Price conflict for ${offering.offeringType} on ${normalizedDomain}: ` +
                `$${(existingPrice/100).toFixed(2)} → $${(newPrice/100).toFixed(2)} (${percentageChange > 0 ? '+' : ''}${percentageChange}%)`
              );
            } else {
              preview.estimatedImpact.updatedRecords++;
            }
          } else if (newPrice === existingPrice || !newPrice) {
            // Same price or no new price - skip duplicate
            preview.proposedActions.offeringActions.push({
              action: 'skip',
              type: offering.offeringType,
              websiteDomain: normalizedDomain,
              existingOffering,
              details: { reason: 'Identical offering already exists' }
            });
            preview.estimatedImpact.skippedDuplicates++;
          } else {
            // No existing price, add new price
            preview.proposedActions.offeringActions.push({
              action: 'update',
              type: offering.offeringType,
              websiteDomain: normalizedDomain,
              existingOffering,
              details: offering
            });
            preview.estimatedImpact.updatedRecords++;
          }
        } else {
          // New offering
          preview.proposedActions.offeringActions.push({
            action: 'create',
            type: offering.offeringType,
            websiteDomain: normalizedDomain,
            details: offering
          });
          preview.estimatedImpact.newOfferings++;
        }
      }
    }

    // 4. CHECK RELATIONSHIPS
    if (publisherId && finalData.websites && Array.isArray(finalData.websites)) {
      for (const websiteData of finalData.websites) {
        const normalizedDomain = normalizeDomain(websiteData.domain);
        const websiteId = websiteIdMap[normalizedDomain];
        
        if (websiteId) {
          const existingRelationship = await db
            .select()
            .from(publisherWebsites)
            .where(and(
              eq(publisherWebsites.publisherId, publisherId),
              eq(publisherWebsites.websiteId, websiteId)
            ))
            .limit(1);
          
          if (existingRelationship.length > 0) {
            preview.currentState.relationships.push(existingRelationship[0]);
            preview.proposedActions.relationshipActions.push({
              action: 'exists',
              publisherEmail: finalData.publisher.email,
              websiteDomain: normalizedDomain,
              existingRelationship: existingRelationship[0]
            });
          } else {
            preview.proposedActions.relationshipActions.push({
              action: 'create',
              publisherEmail: finalData.publisher.email,
              websiteDomain: normalizedDomain
            });
          }
        }
      }
    }

    // 5. ADDITIONAL VALIDATION WARNINGS
    if (preview.estimatedImpact.priceConflicts > 0) {
      preview.warnings.push(
        `⚠️ ${preview.estimatedImpact.priceConflicts} price conflicts require manual review before approval`
      );
    }
    
    if (preview.estimatedImpact.skippedDuplicates > 0) {
      preview.warnings.push(
        `ℹ️ ${preview.estimatedImpact.skippedDuplicates} duplicate offerings will be skipped`
      );
    }
    
    if (preview.proposedActions.publisherAction === 'skip') {
      preview.warnings.push('No publisher will be created - missing email');
    }
    
    if (preview.estimatedImpact.newWebsites === 0 && preview.currentState.websites.length === 0) {
      preview.warnings.push('No websites will be created or linked');
    }
    
    if (finalData.offerings?.length > 0 && preview.estimatedImpact.newOfferings === 0 && preview.estimatedImpact.updatedRecords === 0) {
      preview.warnings.push('Offerings found but none will be created or updated - all are duplicates');
    }

    console.log(`✅ Improved preview generated: ${preview.estimatedImpact.newPublishers} publishers, ${preview.estimatedImpact.newWebsites} websites, ${preview.estimatedImpact.newOfferings} offerings, ${preview.estimatedImpact.priceConflicts} conflicts`);
    
    return NextResponse.json({
      success: true,
      preview,
      extractedData: finalData
    });
    
  } catch (error) {
    console.error('Improved preview generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Preview generation failed' },
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