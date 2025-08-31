import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherWebsites, publisherOfferings, publisherOfferingRelationships, publishers } from '@/lib/db/schema';
import { eq, sql, isNotNull, isNull, and, or, ilike } from 'drizzle-orm';
import { parseAirtableCSV } from '@/lib/utils/csvParser';

export async function GET() {
  try {
    // Parse Airtable data
    const airtableRecords = parseAirtableCSV();
    const airtableMap = new Map(airtableRecords.map(r => [r.domain, r]));
    
    // Get all websites with pricing issues
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

    // Get all existing publishers for email matching
    const allPublishers = await db.select().from(publishers);
    const publisherByEmail = new Map(allPublishers.map(p => [p.email.toLowerCase(), p]));

    // Detailed analysis
    const detailedAnalysis = [];
    const websiteMap = new Map();
    
    // Group by website first
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

    // Analyze each website
    for (const [websiteId, data] of websiteMap) {
      const airtableData = airtableMap.get(data.domain);
      const analysis: any = {
        websiteId,
        domain: data.domain,
        currentGuestPostCost: parseFloat(data.guestPostCost),
        airtableData: {
          found: !!airtableData,
          price: airtableData?.guestPostCost || null,
          emails: airtableData?.postflowContactEmails || [],
          guestPostContact: airtableData?.guestPostContact || null
        },
        currentState: {
          hasPublisher: data.publishers.length > 0,
          publisherCount: data.publishers.length,
          publishers: data.publishers,
          hasOffering: data.offerings.length > 0,
          offeringCount: data.offerings.length,
          offerings: data.offerings
        },
        proposedActions: []
      };

      // Determine what actions would be taken
      if (data.publishers.length === 0) {
        // No publisher linked to website
        analysis.issueType = 'no_publisher';
        
        // Check if we can find a publisher by email from Airtable
        const airtableEmails = [
          ...(airtableData?.postflowContactEmails || []),
          airtableData?.guestPostContact
        ].filter(e => e);
        
        for (const email of airtableEmails) {
          const existingPublisher = publisherByEmail.get(email.toLowerCase());
          if (existingPublisher) {
            analysis.proposedActions.push({
              action: 'link_existing_publisher',
              publisherId: existingPublisher.id,
              publisherEmail: existingPublisher.email,
              publisherStatus: existingPublisher.accountStatus,
              reason: `Found existing publisher with email ${email}`
            });
            break;
          }
        }
        
        if (analysis.proposedActions.length === 0 && airtableEmails.length > 0) {
          analysis.proposedActions.push({
            action: 'create_shadow_publisher',
            email: airtableEmails[0],
            accountStatus: 'shadow',
            reason: 'No existing publisher found, will create shadow publisher from Airtable email'
          });
        }
        
        if (analysis.proposedActions.length === 0) {
          analysis.proposedActions.push({
            action: 'manual_review_required',
            reason: 'No email found in Airtable data to create publisher'
          });
        }
      } else if (data.offerings.length === 0) {
        // Has publisher but no offering
        analysis.issueType = 'no_offering';
        analysis.proposedActions.push({
          action: 'create_offering',
          publisherId: data.publishers[0].id,
          price: airtableData?.guestPostCost || parseFloat(data.guestPostCost),
          reason: 'Publisher exists but has no offering'
        });
      } else if (data.offerings.length > 1) {
        // Multiple offerings
        analysis.issueType = 'multiple_offerings';
        analysis.proposedActions.push({
          action: 'manual_review_required',
          reason: `Website has ${data.offerings.length} offerings, needs manual review to determine which to keep`
        });
      } else {
        // Single offering - check price match
        const offering = data.offerings[0];
        const guestPostCostCents = Math.round(parseFloat(data.guestPostCost) * 100);
        
        if (offering.price !== guestPostCostCents) {
          analysis.issueType = 'price_mismatch';
          analysis.priceDifference = (offering.price - guestPostCostCents) / 100;
          
          const proposedPrice = airtableData?.guestPostCost || parseFloat(data.guestPostCost);
          analysis.proposedActions.push({
            action: 'update_offering_price',
            offeringId: offering.id,
            currentPrice: offering.price / 100,
            proposedPrice,
            reason: `Price mismatch: offering is $${offering.price/100}, guest_post_cost is $${data.guestPostCost}`
          });
        } else {
          analysis.issueType = 'no_issue';
          analysis.proposedActions.push({
            action: 'none',
            reason: 'Prices match, no action needed'
          });
        }
      }

      // Add risk assessment
      analysis.riskLevel = 'low';
      if (analysis.issueType === 'no_publisher' && !airtableData) {
        analysis.riskLevel = 'high';
        analysis.riskReason = 'Creating publisher without Airtable data verification';
      } else if (analysis.issueType === 'multiple_offerings') {
        analysis.riskLevel = 'medium';
        analysis.riskReason = 'Multiple offerings require manual decision';
      } else if (Math.abs(analysis.priceDifference || 0) > 100) {
        analysis.riskLevel = 'high';
        analysis.riskReason = 'Large price difference (>$100)';
      }

      if (analysis.issueType !== 'no_issue') {
        detailedAnalysis.push(analysis);
      }
    }

    // Summary statistics
    const summary = {
      totalIssues: detailedAnalysis.length,
      byIssueType: {
        no_publisher: detailedAnalysis.filter(a => a.issueType === 'no_publisher').length,
        no_offering: detailedAnalysis.filter(a => a.issueType === 'no_offering').length,
        price_mismatch: detailedAnalysis.filter(a => a.issueType === 'price_mismatch').length,
        multiple_offerings: detailedAnalysis.filter(a => a.issueType === 'multiple_offerings').length
      },
      byAction: {
        link_existing_publisher: detailedAnalysis.filter(a => 
          a.proposedActions.some((p: any) => p.action === 'link_existing_publisher')
        ).length,
        create_shadow_publisher: detailedAnalysis.filter(a => 
          a.proposedActions.some((p: any) => p.action === 'create_shadow_publisher')
        ).length,
        create_offering: detailedAnalysis.filter(a => 
          a.proposedActions.some((p: any) => p.action === 'create_offering')
        ).length,
        update_offering_price: detailedAnalysis.filter(a => 
          a.proposedActions.some((p: any) => p.action === 'update_offering_price')
        ).length,
        manual_review_required: detailedAnalysis.filter(a => 
          a.proposedActions.some((p: any) => p.action === 'manual_review_required')
        ).length
      },
      byRisk: {
        high: detailedAnalysis.filter(a => a.riskLevel === 'high').length,
        medium: detailedAnalysis.filter(a => a.riskLevel === 'medium').length,
        low: detailedAnalysis.filter(a => a.riskLevel === 'low').length
      }
    };

    return NextResponse.json({ 
      summary,
      issues: detailedAnalysis.slice(0, 10), // Return first 10 for review
      totalAnalyzed: detailedAnalysis.length
    });
  } catch (error) {
    console.error('Detailed analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze pricing issues in detail' },
      { status: 500 }
    );
  }
}