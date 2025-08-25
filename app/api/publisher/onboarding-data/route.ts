import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/websiteSchema';
import { shadowPublisherWebsites } from '@/lib/db/emailProcessingSchema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

interface PublisherOnboardingData {
  publisher: {
    id: string;
    email: string;
    contactName: string;
    companyName?: string;
    accountStatus: string;
  };
  shadowWebsites: Array<{
    id: string;
    websiteId: string;
    domain: string;
    confidence: number;
    source: string;
    extractionMethod: string;
    verified: boolean;
    migrationStatus: string;
    // Website data
    guestPostCost?: number;
    domainRating?: number;
    totalTraffic?: number;
  }>;
  offerings: Array<{
    id: string;
    offeringType: string;
    basePrice: number;
    currency: string;
    turnaroundDays?: number;
    offeringName?: string;
    minWordCount?: number;
    maxWordCount?: number;
    niches?: string[];
    isActive: boolean;
  }>;
  relationships: Array<{
    id: string;
    websiteId: string;
    offeringId?: string;
    isPrimary: boolean;
    relationshipType: string;
    verificationStatus: string;
    domain: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('auth-token-publisher')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify JWT token
    let publisherId: string;
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
      publisherId = decoded.publisherId || decoded.userId;
      
      if (decoded.userType !== 'publisher') {
        return NextResponse.json(
          { error: 'Publisher authentication required' },
          { status: 403 }
        );
      }
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get publisher data
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);
    
    if (!publisher) {
      return NextResponse.json(
        { error: 'Publisher not found' },
        { status: 404 }
      );
    }

    // Get shadow website data
    const shadowWebsites = await db
      .select({
        id: shadowPublisherWebsites.id,
        websiteId: shadowPublisherWebsites.websiteId,
        confidence: shadowPublisherWebsites.confidence,
        source: shadowPublisherWebsites.source,
        extractionMethod: shadowPublisherWebsites.extractionMethod,
        verified: shadowPublisherWebsites.verified,
        migrationStatus: shadowPublisherWebsites.migrationStatus,
        // Website details
        domain: websites.domain,
        guestPostCost: websites.guestPostCost,
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
      })
      .from(shadowPublisherWebsites)
      .leftJoin(websites, eq(shadowPublisherWebsites.websiteId, websites.id))
      .where(eq(shadowPublisherWebsites.publisherId, publisherId));

    // Get publisher offerings
    const offerings = await db
      .select()
      .from(publisherOfferings)
      .where(eq(publisherOfferings.publisherId, publisherId));

    // Get publisher-website relationships with full website data
    const relationships = await db
      .select({
        id: publisherOfferingRelationships.id,
        websiteId: publisherOfferingRelationships.websiteId,
        offeringId: publisherOfferingRelationships.offeringId,
        isPrimary: publisherOfferingRelationships.isPrimary,
        relationshipType: publisherOfferingRelationships.relationshipType,
        verificationStatus: publisherOfferingRelationships.verificationStatus,
        // Include all website data
        domain: websites.domain,
        guestPostCost: websites.guestPostCost,
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
      })
      .from(publisherOfferingRelationships)
      .leftJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
      .where(eq(publisherOfferingRelationships.publisherId, publisherId));

    // Filter out already migrated shadow websites
    const activeShadowWebsites = shadowWebsites.filter(sw => 
      sw.migrationStatus !== 'migrated' && sw.migrationStatus !== 'completed'
    );
    
    // If no active shadow websites but we have relationships, convert relationships to shadow format for UI
    const websitesData = activeShadowWebsites.length > 0 ? activeShadowWebsites : 
      relationships.map(rel => ({
        id: rel.id,
        websiteId: rel.websiteId,
        domain: rel.domain,
        confidence: 10, // Max confidence for migrated data
        source: 'migrated',
        extractionMethod: 'migration',
        verified: true,
        migrationStatus: 'completed',
        guestPostCost: rel.guestPostCost,
        domainRating: rel.domainRating,
        totalTraffic: rel.totalTraffic,
      }));

    const response: PublisherOnboardingData = {
      publisher: {
        id: publisher.id,
        email: publisher.email,
        contactName: publisher.contactName || '',
        companyName: publisher.companyName || '',
        accountStatus: publisher.accountStatus || 'unknown',
      },
      shadowWebsites: websitesData.map(sw => ({
        id: sw.id,
        websiteId: sw.websiteId,
        domain: sw.domain || 'Unknown domain',
        confidence: sw.confidence ? parseFloat(sw.confidence.toString()) : 0,
        source: sw.source || 'unknown',
        extractionMethod: sw.extractionMethod || 'unknown',
        verified: sw.verified || false,
        migrationStatus: sw.migrationStatus || 'pending',
        guestPostCost: sw.guestPostCost ? (typeof sw.guestPostCost === 'string' ? parseFloat(sw.guestPostCost) : sw.guestPostCost) : undefined,
        domainRating: sw.domainRating || undefined,
        totalTraffic: sw.totalTraffic || undefined,
      })),
      offerings: offerings.map(o => ({
        id: o.id,
        websiteId: (o.attributes as any)?.websiteId || undefined, // Get websiteId from attributes if stored there
        offeringType: o.offeringType,
        basePrice: o.basePrice,
        currency: o.currency,
        turnaroundDays: o.turnaroundDays || undefined,
        offeringName: o.offeringName || undefined,
        minWordCount: o.minWordCount || undefined,
        maxWordCount: o.maxWordCount || undefined,
        niches: o.niches || undefined,
        isActive: o.isActive || false,
      })),
      relationships: relationships.map(r => ({
        id: r.id,
        websiteId: r.websiteId,
        offeringId: r.offeringId || undefined,
        isPrimary: r.isPrimary || false,
        relationshipType: r.relationshipType,
        verificationStatus: r.verificationStatus,
        domain: r.domain || 'Unknown domain',
      })),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch publisher onboarding data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}