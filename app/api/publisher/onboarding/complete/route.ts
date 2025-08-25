import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { 
  publisherOfferings, 
  publisherOfferingRelationships 
} from '@/lib/db/publisherSchemaActual';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Use session-based auth (same as other publisher APIs)
    const { AuthServiceServer } = await import('@/lib/auth-server');
    const session = await AuthServiceServer.getSession(request);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Publisher authentication required' },
        { status: 403 }
      );
    }
    
    // Get publisher ID from session
    const publisherId = session.publisherId || session.userId;

    // Parse request body
    const formData = await request.json();
    
    // Start a transaction
    await db.transaction(async (tx) => {
      // Update publisher information
      await tx
        .update(publishers)
        .set({
          contactName: formData.contactName,
          companyName: formData.companyName,
          paymentEmail: formData.paymentEmail,
          paymentMethod: formData.paymentMethod,
          minimumPayout: formData.minPayout * 100, // Convert to cents
          // Mark onboarding as complete
          updatedAt: new Date(),
        })
        .where(eq(publishers.id, publisherId));

      // Process confirmed websites
      const confirmedWebsites = formData.websites.filter((w: any) => w.confirmed);
      
      for (const website of confirmedWebsites) {
        // Update website information if it exists
        if (website.id && website.websiteId) {
          await tx
            .update(websites)
            .set({
              websiteType: website.websiteType,
              websiteLanguage: website.websiteLanguage,
              categories: website.categories,
              niche: website.niche,
              updatedAt: new Date(),
            })
            .where(eq(websites.id, website.websiteId));
        }
      }

      // Process offerings
      for (const offering of formData.offerings) {
        if (offering.id) {
          // Update existing offering
          await tx
            .update(publisherOfferings)
            .set({
              offeringType: offering.offeringType,
              basePrice: Math.round(offering.basePrice * 100), // Convert dollars to cents
              currency: offering.currency,
              turnaroundDays: offering.turnaroundDays,
              minWordCount: offering.offeringType === 'guest_post' ? offering.minWordCount : null,
              maxWordCount: offering.offeringType === 'guest_post' ? offering.maxWordCount : null,
              attributes: {
                acceptsDoFollow: offering.acceptsDoFollow,
                maxLinksPerPost: offering.maxLinksPerPost,
                contentRequirements: offering.contentRequirements,
                prohibitedTopics: offering.prohibitedTopics,
                requiredElements: offering.requiredElements,
                samplePostUrl: offering.samplePostUrl,
                imagesRequired: offering.imagesRequired,
                minImages: offering.minImages,
              },
              isActive: true,
              updatedAt: new Date(),
            })
            .where(and(
              eq(publisherOfferings.id, offering.id),
              eq(publisherOfferings.publisherId, publisherId)
            ));
        } else {
          // Create new offering if it doesn't exist
          const newOfferingId = uuidv4();
          await tx
            .insert(publisherOfferings)
            .values({
              id: newOfferingId,
              publisherId: publisherId,
              offeringType: offering.offeringType || 'guest_post',
              basePrice: Math.round(offering.basePrice * 100), // Convert dollars to cents
              currency: offering.currency || 'USD',
              turnaroundDays: offering.turnaroundDays || 7,
              minWordCount: offering.offeringType === 'guest_post' ? (offering.minWordCount || 500) : null,
              maxWordCount: offering.offeringType === 'guest_post' ? (offering.maxWordCount || 2000) : null,
              currentAvailability: 'available',
              attributes: {
                acceptsDoFollow: offering.acceptsDoFollow !== undefined ? offering.acceptsDoFollow : true,
                maxLinksPerPost: offering.maxLinksPerPost || 2,
                contentRequirements: offering.contentRequirements || '',
                prohibitedTopics: offering.prohibitedTopics || [],
                requiredElements: offering.requiredElements || [],
                samplePostUrl: offering.samplePostUrl || '',
                imagesRequired: offering.imagesRequired || false,
                minImages: offering.minImages || 0,
              },
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

          // Create relationships for this offering with confirmed websites
          for (const website of confirmedWebsites) {
            if (website.websiteId) {
              await tx
                .insert(publisherOfferingRelationships)
                .values({
                  id: uuidv4(),
                  publisherId: publisherId,
                  offeringId: newOfferingId,
                  websiteId: website.websiteId,
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

      // If no offerings exist, create a default guest post offering
      if (formData.offerings.length === 0 && confirmedWebsites.length > 0) {
        const defaultOfferingId = uuidv4();
        await tx
          .insert(publisherOfferings)
          .values({
            id: defaultOfferingId,
            publisherId: publisherId,
            offeringType: 'guest_post',
            basePrice: 200, // Default $200
            currency: 'USD',
            turnaroundDays: 7,
            currentAvailability: 'available',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        // Create relationships with confirmed websites
        for (const website of confirmedWebsites) {
          if (website.websiteId) {
            await tx
              .insert(publisherOfferingRelationships)
              .values({
                id: uuidv4(),
                publisherId: publisherId,
                offeringId: defaultOfferingId,
                websiteId: website.websiteId,
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
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    });

  } catch (error) {
    console.error('Failed to complete onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}