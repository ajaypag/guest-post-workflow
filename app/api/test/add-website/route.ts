import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherWebsites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publisherId, domain, scenario } = body;
    
    if (!publisherId || !domain) {
      return NextResponse.json(
        { error: 'Publisher ID and domain are required' },
        { status: 400 }
      );
    }
    
    const normalizedDomain = normalizeDomain(domain);
    console.log(`🔍 Testing ${scenario}: Publisher ${publisherId} adding domain "${normalizedDomain}"`);
    
    // Check if domain already exists in websites table
    const [existingWebsite] = await db
      .select()
      .from(websites)
      .where(eq(websites.domain, normalizedDomain as unknown as string))
      .limit(1);
    
    // Check if publisher already has this website
    let publisherHasWebsite = false;
    if (existingWebsite) {
      const [existingRelationship] = await db
        .select()
        .from(publisherWebsites)
        .where(
          and(
            eq(publisherWebsites.websiteId, existingWebsite.id),
            eq(publisherWebsites.publisherId, publisherId),
            eq(publisherWebsites.status, 'active')
          )
        )
        .limit(1);
      
      publisherHasWebsite = !!existingRelationship;
    }
    
    // Check if website belongs to another publisher
    let belongsToOtherPublisher = false;
    let otherPublisherCount = 0;
    if (existingWebsite) {
      const otherPublisherRelationships = await db
        .select()
        .from(publisherWebsites)
        .where(
          and(
            eq(publisherWebsites.websiteId, existingWebsite.id),
            eq(publisherWebsites.status, 'active')
          )
        );
      
      otherPublisherCount = otherPublisherRelationships.length;
      belongsToOtherPublisher = otherPublisherRelationships.some(
        rel => rel.publisherId !== publisherId
      );
    }
    
    // Simulate the actual validation logic that should be in the real API
    if (publisherHasWebsite) {
      return NextResponse.json({
        success: false,
        error: 'You already have this website in your portfolio',
        scenario,
        analysis: {
          websiteExists: !!existingWebsite,
          publisherHasWebsite,
          belongsToOtherPublisher,
          otherPublisherCount,
          shouldBeBlocked: true,
          reason: 'Publisher already owns this website'
        }
      });
    }
    
    if (belongsToOtherPublisher) {
      // This depends on business rules - should multiple publishers be able to claim the same domain?
      return NextResponse.json({
        success: false,
        error: 'This website is already claimed by another publisher',
        scenario,
        analysis: {
          websiteExists: !!existingWebsite,
          publisherHasWebsite,
          belongsToOtherPublisher,
          otherPublisherCount,
          shouldBeBlocked: true,
          reason: 'Website already claimed by another publisher'
        }
      });
    }
    
    // If we get here, the website could potentially be added
    return NextResponse.json({
      success: true,
      message: `Website "${normalizedDomain}" can be added`,
      scenario,
      analysis: {
        websiteExists: !!existingWebsite,
        publisherHasWebsite,
        belongsToOtherPublisher,
        otherPublisherCount,
        shouldBeBlocked: false,
        reason: 'Website is available for this publisher'
      }
    });
    
  } catch (error) {
    console.error('Failed to test website addition:', error);
    return NextResponse.json(
      { error: 'Failed to test website addition' },
      { status: 500 }
    );
  }
}