import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { eq, or } from 'drizzle-orm';
import { publishers } from '@/lib/db/accountSchema';
import { publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { shadowPublisherWebsites } from '@/lib/db/emailProcessingSchema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get publishers for this website through BOTH publisher_offering_relationships AND shadow_publisher_websites
    // This fixes the bug where shadow publishers weren't showing up
    
    // First get publishers through offering relationships (active publishers)
    const offeringPublishers = await db
      .selectDistinct({
        id: publishers.id,
        email: publishers.email,
        name: publishers.contactName,
        company: publishers.companyName,
        status: publishers.status,
      })
      .from(publishers)
      .innerJoin(
        publisherOfferingRelationships,
        eq(publisherOfferingRelationships.publisherId, publishers.id)
      )
      .where(eq(publisherOfferingRelationships.websiteId, id));

    // Then get publishers through shadow relationships (unclaimed/shadow publishers)
    const shadowPublishers = await db
      .selectDistinct({
        id: publishers.id,
        email: publishers.email,
        name: publishers.contactName,
        company: publishers.companyName,
        status: publishers.status,
      })
      .from(publishers)
      .innerJoin(
        shadowPublisherWebsites,
        eq(shadowPublisherWebsites.publisherId, publishers.id)
      )
      .where(eq(shadowPublisherWebsites.websiteId, id));

    // Combine and deduplicate publishers (offering relationships take precedence)
    const publisherMap = new Map();
    
    // Add offering publishers first (they take precedence)
    offeringPublishers.forEach(pub => {
      publisherMap.set(pub.id, pub);
    });
    
    // Add shadow publishers only if not already present
    shadowPublishers.forEach(pub => {
      if (!publisherMap.has(pub.id)) {
        publisherMap.set(pub.id, pub);
      }
    });
    
    const publishersData = Array.from(publisherMap.values());

    console.log(`Publishers for website ${id}:`, publishersData.length, 'found');
    console.log('Offering relationships:', offeringPublishers.length);
    console.log('Shadow relationships:', shadowPublishers.length);
    console.log('Publisher data:', publishersData);

    return NextResponse.json({
      publishers: publishersData,
      count: publishersData.length,
      debug: {
        offeringCount: offeringPublishers.length,
        shadowCount: shadowPublishers.length,
        totalUnique: publishersData.length
      }
    });
  } catch (error) {
    console.error('Failed to fetch publishers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publishers' },
      { status: 500 }
    );
  }
}