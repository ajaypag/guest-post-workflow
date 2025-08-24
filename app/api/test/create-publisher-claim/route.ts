import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { websites } from '@/lib/db/websiteSchema';
import { shadowPublisherWebsites } from '@/lib/db/emailProcessingSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const testEmail = 'test-publisher@example.com';
    
    // Check if test publisher already exists
    const [existingPublisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.email, testEmail))
      .limit(1);

    let publisherId: string;

    if (existingPublisher) {
      publisherId = existingPublisher.id;
      
      // Update with new claim token (using hex to avoid URL encoding issues)
      const invitationToken = crypto.randomBytes(32).toString('hex');
      
      await db
        .update(publishers)
        .set({
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          accountStatus: 'shadow', // Ensure it's in shadow status for claiming
          updatedAt: new Date()
        })
        .where(eq(publishers.id, publisherId));

      console.log('🔄 Updated claim token for existing test publisher');
    } else {
      // Create new test publisher (using hex to avoid URL encoding issues)
      const invitationToken = crypto.randomBytes(32).toString('hex');
      
      const [newPublisher] = await db
        .insert(publishers)
        .values({
          id: crypto.randomUUID(),
          email: testEmail,
          contactName: 'Test Publisher',
          companyName: 'Test Publishing Company',
          accountStatus: 'shadow',
          source: 'manyreach',
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({ id: publishers.id });

      publisherId = newPublisher.id;
      console.log('✅ Created new test publisher');
    }

    // Create some test shadow websites with proper categories and niches
    const testWebsites = [
      { 
        domain: 'techblog.example.com', 
        dr: 65, 
        traffic: 125000, 
        price: 250,
        categories: ['Technology', 'Business', 'Marketing'],
        niches: ['SaaS', 'B2B'],
        websiteType: ['Blog']
      },
      { 
        domain: 'marketinginsights.example.com', 
        dr: 72, 
        traffic: 250000, 
        price: 350,
        categories: ['Marketing', 'Business', 'Finance'],
        niches: ['B2B', 'E-commerce'],
        websiteType: ['Blog', 'Magazine']
      },
      { 
        domain: 'businessnews.example.com', 
        dr: 58, 
        traffic: 85000, 
        price: 200,
        categories: ['Business', 'Finance', 'Technology'],
        niches: ['B2C', 'Fintech'],
        websiteType: ['News Site']
      }
    ];
    
    // Create shadow offerings based on extracted pricing
    const shadowOfferings = [
      {
        offeringType: 'guest_post' as const,
        basePrice: 250,
        currency: 'USD',
        turnaroundDays: 7,
        minWordCount: 800,
        maxWordCount: 2000,
        attributes: {
          acceptsDoFollow: true,
          maxLinksPerPost: 2,
          contentRequirements: 'High-quality, original content required. Must be relevant to tech/business topics.',
          prohibitedTopics: ['Gambling', 'Adult Content', 'Crypto/NFT'],
          requiredElements: ['Featured Image', 'Meta Description'],
          samplePostUrl: 'https://techblog.example.com/sample-guest-post',
          imagesRequired: true,
          minImages: 1,
        },
        isActive: true,
      },
      {
        offeringType: 'link_insertion' as const,
        basePrice: 150,
        currency: 'USD',
        turnaroundDays: 3,
        attributes: {
          acceptsDoFollow: true,
          maxLinksPerPost: 1,
          contentRequirements: 'Links must be relevant to existing content.',
          prohibitedTopics: ['gambling', 'adult'],
          requiredElements: [],
          imagesRequired: false,
        },
        isActive: true,
      }
    ];

    for (const testSite of testWebsites) {
      // Check if website exists
      let [website] = await db
        .select()
        .from(websites)
        .where(eq(websites.domain, testSite.domain))
        .limit(1);

      // Create website if it doesn't exist
      if (!website) {
        [website] = await db
          .insert(websites)
          .values({
            id: crypto.randomUUID(),
            domain: testSite.domain,
            domainRating: testSite.dr,
            totalTraffic: testSite.traffic,
            guestPostCost: testSite.price.toFixed(2),
            categories: testSite.categories,
            niche: testSite.niches,
            websiteType: testSite.websiteType,
            source: 'manual',
            airtableCreatedAt: new Date(),
            airtableUpdatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
      }

      // Check if shadow relationship exists
      const [existingShadow] = await db
        .select()
        .from(shadowPublisherWebsites)
        .where(
          and(
            eq(shadowPublisherWebsites.publisherId, publisherId),
            eq(shadowPublisherWebsites.websiteId, website.id)
          )
        )
        .limit(1);

      // Create shadow website relationship if it doesn't exist
      if (!existingShadow) {
        await db
          .insert(shadowPublisherWebsites)
          .values({
            publisherId,
            websiteId: website.id,
            confidence: '0.95',
            source: 'email_extraction',
            extractionMethod: 'signature_parser',
            verified: true, // All websites verified for easier testing
            migrationStatus: 'pending'
          });
      }
    }

    // Create shadow offerings for the test publisher
    for (const shadowOffering of shadowOfferings) {
      // Check if offering already exists
      const [existingOffering] = await db
        .select()
        .from(publisherOfferings)
        .where(
          and(
            eq(publisherOfferings.publisherId, publisherId),
            eq(publisherOfferings.offeringType, shadowOffering.offeringType)
          )
        )
        .limit(1);

      let offeringId: string;
      
      if (!existingOffering) {
        // Create the offering
        const [newOffering] = await db
          .insert(publisherOfferings)
          .values({
            id: crypto.randomUUID(),
            publisherId,
            offeringType: shadowOffering.offeringType,
            basePrice: shadowOffering.basePrice,
            currency: shadowOffering.currency,
            turnaroundDays: shadowOffering.turnaroundDays,
            minWordCount: shadowOffering.offeringType === 'guest_post' ? shadowOffering.minWordCount : null,
            maxWordCount: shadowOffering.offeringType === 'guest_post' ? shadowOffering.maxWordCount : null,
            currentAvailability: 'available',
            attributes: shadowOffering.attributes,
            isActive: shadowOffering.isActive,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: publisherOfferings.id });
        
        offeringId = newOffering.id;
        console.log(`✅ Created shadow offering: ${shadowOffering.offeringType}`);
      } else {
        offeringId = existingOffering.id;
        console.log(`🔄 Using existing offering: ${shadowOffering.offeringType}`);
      }

      // Create offering-website relationships
      for (const testSite of testWebsites) {
        const [website] = await db
          .select()
          .from(websites)
          .where(eq(websites.domain, testSite.domain))
          .limit(1);

        if (website) {
          // Check if relationship exists
          const [existingRel] = await db
            .select()
            .from(publisherOfferingRelationships)
            .where(
              and(
                eq(publisherOfferingRelationships.publisherId, publisherId),
                eq(publisherOfferingRelationships.offeringId, offeringId),
                eq(publisherOfferingRelationships.websiteId, website.id)
              )
            )
            .limit(1);

          if (!existingRel) {
            await db
              .insert(publisherOfferingRelationships)
              .values({
                id: crypto.randomUUID(),
                publisherId,
                offeringId,
                websiteId: website.id,
                isPrimary: true,
                isActive: true,
                relationshipType: 'owner',
                verificationStatus: 'verified',
                createdAt: new Date(),
                updatedAt: new Date(),
              });
          }
        }
      }
    }

    // Get updated publisher with token
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);

    if (!publisher || !publisher.invitationToken) {
      throw new Error('Failed to create publisher with token');
    }

    // Generate claim URL
    const baseUrl = process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const claimUrl = `${baseUrl}/publisher/claim?token=${publisher.invitationToken}`;

    return NextResponse.json({
      success: true,
      publisher: {
        id: publisher.id,
        email: publisher.email,
        contactName: publisher.contactName,
        companyName: publisher.companyName,
        accountStatus: publisher.accountStatus,
        source: publisher.source
      },
      claimUrl,
      token: publisher.invitationToken,
      testUrls: {
        landingPage: `${baseUrl}/publisher`,
        signupPage: `${baseUrl}/publisher/signup`,
        loginPage: `${baseUrl}/publisher/login`,
        claimPage: claimUrl
      },
      message: 'Test publisher claim created successfully! Use the claimUrl to test the new claim flow.'
    });

  } catch (error) {
    console.error('❌ Error creating test publisher claim:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create test publisher claim',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}