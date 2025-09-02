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
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { draftId } = await request.json();
    
    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    console.log(`✅ Approving draft ${draftId}...`);
    
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
    
    // Check if already approved
    if (draft.status === 'approved' && draft.publisher_id) {
      return NextResponse.json({ 
        error: 'Draft already approved',
        publisherId: draft.publisher_id 
      }, { status: 400 });
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
      errors: []
    };

    // Start transaction
    try {
      // 1. CREATE OR UPDATE PUBLISHER
      let publisherId: string | undefined;
      
      if (finalData.publisher?.email) {
        // Check if publisher exists
        const existingPublisher = await db
          .select()
          .from(publishers)
          .where(eq(publishers.email, finalData.publisher.email))
          .limit(1);
        
        if (existingPublisher.length > 0) {
          // Update existing publisher
          publisherId = existingPublisher[0].id;
          console.log(`📝 Updating existing publisher: ${publisherId}`);
          
          await db.update(publishers)
            .set({
              contactName: finalData.publisher.contactName || existingPublisher[0].contactName,
              companyName: finalData.publisher.companyName || existingPublisher[0].companyName,
              phone: finalData.publisher.phone || existingPublisher[0].phone,
              paymentEmail: finalData.publisher.paymentEmail || existingPublisher[0].paymentEmail,
              // Update payment method if provided
              ...(finalData.publisher.paymentMethods?.length && {
                paymentMethod: finalData.publisher.paymentMethods[0]
              }),
              updatedAt: new Date()
            })
            .where(eq(publishers.id, publisherId));
            
        } else {
          // Create new shadow publisher
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
          
          // Check if website exists
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
            const newCategories = websiteData.categories || [];
            const hasNewCategories = newCategories.some((cat: string) => !existingCategories.includes(cat));
            
            if (hasNewCategories) {
              const mergedCategories = [...new Set([...existingCategories, ...newCategories])];
              await db.update(websites)
                .set({
                  categories: mergedCategories,
                  updatedAt: new Date()
                })
                .where(eq(websites.id, websiteId));
            }
          } else {
            // Create new website
            console.log(`🆕 Creating new website: ${normalizedDomain}`);
            
            const newWebsite = await db.insert(websites)
              .values({
                id: crypto.randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
                domain: normalizedDomain,
                categories: websiteData.categories || [],
                niche: websiteData.niche || [],
                websiteType: websiteData.websiteType || [],
                domainRating: websiteData.domainRating,
                internalNotes: websiteData.internalNotes,
                status: 'active',
                // Add required timestamp fields
                airtableCreatedAt: new Date(),
                airtableUpdatedAt: new Date()
              })
              .returning();
            
            websiteId = newWebsite[0].id;
            result.created.websiteIds.push(websiteId);
          }
          
          websiteIdMap[normalizedDomain] = websiteId;
          
          // Create publisher-website relationship
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
            await db.insert(publisherWebsites)
              .values({
                id: crypto.randomUUID(),
                publisherId: publisherId!,
                websiteId: websiteId,
                status: 'active'
              });
          }
        }
      }

      // 3. CREATE OFFERINGS
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
          
          // Create offering
          console.log(`💰 Creating offering: ${offering.offeringType} for ${normalizedDomain}`);
          
          // Get email content if available for tracking
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
              // Use HTML content if available, otherwise raw content
              emailContent = emailLog[0].htmlContent || emailLog[0].rawContent;
              
              // Extract pricing snippet from AI metadata or find in email
              if (parsedData.extractionMetadata?.pricingSource) {
                // Use the pricing source quote from AI extraction
                pricingSnippet = parsedData.extractionMetadata.pricingSource;
              } else if (emailContent && offering.basePrice) {
                // Fallback: Look for price mentions in the email
                const pricePatterns = [
                  new RegExp(`\\$${offering.basePrice}[\\s\\S]{0,100}`, 'i'),
                  new RegExp(`[\\s\\S]{0,100}\\$${offering.basePrice}`, 'i'),
                  new RegExp(`${offering.basePrice}[\\s\\S]{0,100}`, 'i')
                ];
                
                for (const pattern of pricePatterns) {
                  const match = emailContent.match(pattern);
                  if (match) {
                    pricingSnippet = match[0].substring(0, 500); // Limit to 500 chars
                    break;
                  }
                }
              }
            }
          }
          
          // Determine availability based on price completeness
          const hasValidPrice = offering.basePrice !== null && offering.basePrice !== undefined;
          const availability = hasValidPrice ? 'available' : 'needs_info';
          
          // Now that schema matches DB, use Drizzle ORM properly with explicit nulls
          const newOffering = await db.insert(publisherOfferings)
            .values({
              id: crypto.randomUUID(),
              publisherId: publisherId!,
              offeringType: offering.offeringType,
              basePrice: hasValidPrice ? offering.basePrice : null,
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
              // Add the email tracking fields with actual content
              sourceEmailId: draft.email_log_id || null,
              sourceEmailContent: emailContent as any,
              pricingExtractedFrom: pricingSnippet as any
            })
            .returning();
          
          const offeringId = newOffering[0].id;
          result.created.offeringIds.push(offeringId);
          
          // Create or update offering relationship
          const existingRelationship = await db
            .select()
            .from(publisherOfferingRelationships)
            .where(and(
              eq(publisherOfferingRelationships.publisherId, publisherId!),
              eq(publisherOfferingRelationships.websiteId, websiteId)
            ))
            .limit(1);
          
          if (existingRelationship.length > 0) {
            // Update relationship with offering
            await db.update(publisherOfferingRelationships)
              .set({
                offeringId: offeringId,
                updatedAt: new Date()
              })
              .where(eq(publisherOfferingRelationships.id, existingRelationship[0].id));
          } else {
            // Create new relationship
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
      
      console.log(`✅ Draft approved successfully!`);
      console.log(`   Publisher: ${publisherId}`);
      console.log(`   Websites: ${result.created.websiteIds.length} created`);
      console.log(`   Offerings: ${result.created.offeringIds.length} created`);
      console.log(`   Relationships: ${result.created.relationshipIds.length} created`);
      
      return NextResponse.json(result);
      
    } catch (error) {
      console.error('Error during approval transaction:', error);
      // Log the full error for debugging
      if (error instanceof Error && 'code' in error) {
        console.error('Database error code:', (error as any).code);
        console.error('Database error detail:', (error as any).detail);
      }
      result.errors.push(error instanceof Error ? error.message : 'Transaction failed');
      return NextResponse.json(result, { status: 500 });
    }
    
  } catch (error) {
    console.error('Draft approval error:', error);
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