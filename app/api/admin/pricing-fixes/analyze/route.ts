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
    
    // Get all websites with pricing
    const websitesWithPricing = await db
      .select({
        websiteId: websites.id,
        domain: websites.domain,
        guestPostCost: websites.guestPostCost,
        publisherId: publisherWebsites.publisherId,
        publisherName: publishers.companyName,
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
          name: row.publisherName
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

    // Analyze issues
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
      const guestPostCostCents = Math.round(parseFloat(data.guestPostCost) * 100);
      
      let issue: any = {
        id: websiteId,
        websiteId,
        domain: data.domain,
        currentGuestPostCost: parseFloat(data.guestPostCost),
        currentOfferingPrice: null,
        airtablePrice: airtableData?.guestPostCost || null,
        airtableEmail: airtableData?.postflowContactEmails?.[0] || airtableData?.guestPostContact || null,
        publisherName: data.publishers[0]?.name || null,
        status: 'pending',
        confidence: 'medium'
      };

      // Determine issue type
      if (data.publishers.length === 0) {
        issue.issueType = 'no_publisher';
        issue.proposedAction = 'Create publisher from Airtable contact and assign';
        issue.proposedPrice = airtableData?.guestPostCost || parseFloat(data.guestPostCost);
        issue.confidence = airtableData ? 'high' : 'low';
        stats.noPublisher++;
      } else if (data.offerings.length === 0) {
        issue.issueType = 'no_offering';
        issue.proposedAction = 'Create offering with price from Airtable';
        issue.proposedPrice = airtableData?.guestPostCost || parseFloat(data.guestPostCost);
        issue.confidence = airtableData ? 'high' : 'medium';
        stats.noOffering++;
      } else if (data.offerings.length > 1) {
        issue.issueType = 'multiple_offerings';
        issue.currentOfferingPrice = data.offerings[0].price;
        issue.proposedAction = 'Keep offering that matches Airtable price, archive others';
        issue.proposedPrice = airtableData?.guestPostCost || parseFloat(data.guestPostCost);
        issue.confidence = 'low';
        stats.multipleOfferings++;
      } else {
        // Single offering - check price match
        const offering = data.offerings[0];
        issue.currentOfferingPrice = offering.price;
        
        if (offering.price !== guestPostCostCents) {
          issue.issueType = 'price_mismatch';
          issue.priceDifference = (offering.price - guestPostCostCents) / 100;
          
          // Use Airtable as source of truth if available
          if (airtableData?.guestPostCost) {
            issue.proposedPrice = airtableData.guestPostCost;
            issue.proposedAction = `Update offering price to match Airtable ($${airtableData.guestPostCost})`;
            issue.confidence = 'high';
          } else {
            issue.proposedPrice = parseFloat(data.guestPostCost);
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