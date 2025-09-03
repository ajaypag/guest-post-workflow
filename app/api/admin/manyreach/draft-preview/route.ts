import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers, publisherWebsites } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { eq, sql } from 'drizzle-orm';
import { requireInternalUser } from '@/lib/auth/middleware';

interface PreviewResult {
  draftId: string;
  currentState: {
    publisher?: any;
    websites: any[];
    offerings: any[];
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
      action: 'create' | 'update' | 'skip';
      type: string;
      websiteDomain: string;
      details?: any;
    }>;
    relationshipActions: Array<{
      action: 'create' | 'exists';
      publisherEmail: string;
      websiteDomain: string;
    }>;
  };
  warnings: string[];
  estimatedImpact: {
    newPublishers: number;
    newWebsites: number;
    newOfferings: number;
    updatedRecords: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }
    
    const { draftId } = await request.json();
    
    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    console.log(`🔍 Generating preview for draft ${draftId}...`);
    
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
        offerings: []
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
        updatedRecords: 0
      }
    };

    // 1. CHECK PUBLISHER
    if (finalData.publisher?.email) {
      const existingPublisher = await db
        .select()
        .from(publishers)
        .where(eq(publishers.email, finalData.publisher.email))
        .limit(1);
      
      if (existingPublisher.length > 0) {
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
            // Note: We don't override existing payment methods, just add new ones
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
          source: 'manyreach',
          sourceMetadata: {
            draftId,
            campaignId: draft.campaign_id,
            extractedAt: new Date().toISOString()
          }
        };
        preview.estimatedImpact.newPublishers++;
      }
    } else {
      preview.warnings.push('No publisher email found - cannot create publisher record');
    }

    // 2. CHECK WEBSITES
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
          preview.currentState.websites.push(existingWebsite[0]);
          preview.proposedActions.websiteActions.push({
            action: 'exists',
            domain: normalizedDomain,
            existingWebsite: existingWebsite[0]
          });
          
          // Check if categories/niches would be updated
          const existingCategories = existingWebsite[0].categories || [];
          const newCategories = websiteData.categories || [];
          const hasNewCategories = newCategories.some((cat: string) => !existingCategories.includes(cat));
          
          if (hasNewCategories) {
            preview.proposedActions.websiteActions[preview.proposedActions.websiteActions.length - 1].action = 'update';
            preview.proposedActions.websiteActions[preview.proposedActions.websiteActions.length - 1].details = {
              addCategories: newCategories.filter((cat: string) => !existingCategories.includes(cat))
            };
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
        
        // Check publisher-website relationship
        if (finalData.publisher?.email) {
          preview.proposedActions.relationshipActions.push({
            action: 'create', // Will be checked more thoroughly in actual creation
            publisherEmail: finalData.publisher.email,
            websiteDomain: normalizedDomain
          });
        }
      }
    }

    // 3. CHECK OFFERINGS
    if (finalData.offerings && Array.isArray(finalData.offerings)) {
      for (const offering of finalData.offerings) {
        if (!offering.websiteDomain) {
          preview.warnings.push(`Offering of type ${offering.offeringType} has no website domain - will be skipped`);
          continue;
        }
        
        const normalizedDomain = normalizeDomain(offering.websiteDomain);
        const websiteExists = preview.proposedActions.websiteActions.some(
          w => w.domain === normalizedDomain && (w.action === 'exists' || w.action === 'create' || w.action === 'update')
        );
        
        if (!websiteExists) {
          preview.warnings.push(`Offering for ${offering.websiteDomain} - website not in extraction, will be skipped`);
          preview.proposedActions.offeringActions.push({
            action: 'skip',
            type: offering.offeringType,
            websiteDomain: normalizedDomain,
            details: { reason: 'Website not found in extraction' }
          });
        } else {
          // Check if similar offering already exists
          // (In real implementation, would check database)
          preview.proposedActions.offeringActions.push({
            action: 'create',
            type: offering.offeringType,
            websiteDomain: normalizedDomain,
            details: {
              basePrice: offering.basePrice,
              currency: offering.currency || 'USD',
              turnaroundDays: offering.turnaroundDays,
              minWordCount: offering.minWordCount,
              maxWordCount: offering.maxWordCount,
              requirements: offering.requirements
            }
          });
          preview.estimatedImpact.newOfferings++;
        }
      }
    }

    // 4. ADD WARNINGS FOR COMMON ISSUES
    if (preview.proposedActions.publisherAction === 'skip') {
      preview.warnings.push('No publisher will be created - missing email');
    }
    
    if (preview.estimatedImpact.newWebsites === 0 && preview.currentState.websites.length === 0) {
      preview.warnings.push('No websites will be created or linked');
    }
    
    if (finalData.offerings?.length > 0 && preview.estimatedImpact.newOfferings === 0) {
      preview.warnings.push('Offerings found but none will be created - check website associations');
    }
    
    // Check for duplicate prevention
    if (preview.proposedActions.publisherAction === 'update') {
      const publisher = preview.currentState.publisher;
      if (publisher?.sourceMetadata) {
        const metadata = typeof publisher.sourceMetadata === 'string' 
          ? JSON.parse(publisher.sourceMetadata) 
          : publisher.sourceMetadata;
        if (metadata.draftId === draftId) {
          preview.warnings.push('This draft may have already been processed');
        }
      }
    }

    console.log(`✅ Preview generated: ${preview.estimatedImpact.newPublishers} publishers, ${preview.estimatedImpact.newWebsites} websites, ${preview.estimatedImpact.newOfferings} offerings`);
    
    return NextResponse.json({
      success: true,
      preview,
      extractedData: finalData
    });
    
  } catch (error) {
    console.error('Preview generation error:', error);
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