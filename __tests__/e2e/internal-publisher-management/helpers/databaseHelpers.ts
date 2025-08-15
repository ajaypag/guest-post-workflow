import { db } from '@/lib/db/connection';
import { users, publishers, websites } from '@/lib/db/schema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and, ilike } from 'drizzle-orm';
import { TestUser, TestPublisher, TestWebsite } from './testData';
import bcrypt from 'bcryptjs';

export class DatabaseHelpers {
  /**
   * Clean up test data after tests
   */
  static async cleanupTestData() {
    try {
      // Delete test publisher offering relationships
      await db.delete(publisherOfferingRelationships)
        .where(
          ilike(publisherOfferingRelationships.publisherId, '%test%')
        );

      // Delete test publisher offerings
      await db.delete(publisherOfferings)
        .where(
          ilike(publisherOfferings.publisherId, '%test%')
        );

      // Delete test publishers
      await db.delete(publishers)
        .where(
          ilike(publishers.email, '%test%')
        );

      // Delete test websites
      await db.delete(websites)
        .where(
          ilike(websites.domain, '%test%')
        );

      // Delete test internal users
      await db.delete(users)
        .where(
          ilike(users.email, '%test%')
        );

      console.log('Test data cleanup completed');
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }

  /**
   * Create a test internal user
   */
  static async createTestInternalUser(userData: TestUser) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      await db.insert(users).values({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        passwordHash: hashedPassword,
        role: userData.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return userData;
    } catch (error) {
      console.error('Error creating test internal user:', error);
      throw error;
    }
  }

  /**
   * Create a test publisher
   */
  static async createTestPublisher(publisherData: TestPublisher) {
    try {
      const hashedPassword = await bcrypt.hash(publisherData.password, 10);
      
      await db.insert(publishers).values({
        id: publisherData.id,
        email: publisherData.email,
        password: hashedPassword,
        companyName: publisherData.companyName || null,
        contactName: publisherData.contactName,
        phone: publisherData.phone || null,
        status: publisherData.status || 'pending',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return publisherData;
    } catch (error) {
      console.error('Error creating test publisher:', error);
      throw error;
    }
  }

  /**
   * Create a test website
   */
  static async createTestWebsite(websiteData: TestWebsite) {
    try {
      await db.insert(websites).values({
        id: websiteData.id,
        domain: websiteData.domain,
        domainRating: websiteData.domainRating,
        totalTraffic: websiteData.totalTraffic,
        guestPostCost: websiteData.guestPostCost,
        status: websiteData.status,
        categories: websiteData.categories,
        niche: websiteData.categories,
        type: ['blog'],
        hasGuestPost: true,
        airtableId: `airtable-${websiteData.id}`,
        airtableCreatedAt: new Date(),
        airtableUpdatedAt: new Date(),
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return websiteData;
    } catch (error) {
      console.error('Error creating test website:', error);
      throw error;
    }
  }

  /**
   * Create a publisher offering
   */
  static async createTestOffering(offeringData: any) {
    try {
      await db.insert(publisherOfferings).values({
        id: offeringData.id,
        publisherId: offeringData.publisherId,
        offeringType: offeringData.offeringType,
        basePrice: offeringData.basePrice,
        turnaroundDays: offeringData.turnaroundDays,
        minWordCount: offeringData.minWordCount,
        maxWordCount: offeringData.maxWordCount,
        niches: offeringData.niches,
        languages: offeringData.languages,
        attributes: {
          contentRequirements: {
            requiresImages: true,
            requiresLinks: true,
          },
          restrictions: {
            noGambling: true,
            noPorn: true,
          },
        },
        isActive: offeringData.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return offeringData;
    } catch (error) {
      console.error('Error creating test offering:', error);
      throw error;
    }
  }

  /**
   * Create a publisher-website relationship
   */
  static async createTestRelationship(relationshipData: any) {
    try {
      await db.insert(publisherOfferingRelationships).values({
        id: relationshipData.id,
        publisherId: relationshipData.publisherId,
        offeringId: relationshipData.offeringId,
        websiteId: relationshipData.websiteId,
        isPrimary: relationshipData.isPrimary,
        isActive: relationshipData.isActive,
        relationshipType: relationshipData.relationshipType,
        verificationStatus: relationshipData.verificationStatus,
        priorityRank: relationshipData.priorityRank,
        isPreferred: relationshipData.isPreferred,
        customTerms: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return relationshipData;
    } catch (error) {
      console.error('Error creating test relationship:', error);
      throw error;
    }
  }

  /**
   * Verify publisher exists in database
   */
  static async verifyPublisherExists(publisherId: string) {
    const publisher = await db.select()
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);
    
    return publisher.length > 0;
  }

  /**
   * Verify website exists in database
   */
  static async verifyWebsiteExists(websiteId: string) {
    const website = await db.select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    
    return website.length > 0;
  }

  /**
   * Verify relationship exists in database
   */
  static async verifyRelationshipExists(publisherId: string, websiteId: string) {
    const relationship = await db.select()
      .from(publisherOfferingRelationships)
      .where(
        and(
          eq(publisherOfferingRelationships.publisherId, publisherId),
          eq(publisherOfferingRelationships.websiteId, websiteId)
        )
      )
      .limit(1);
    
    return relationship.length > 0;
  }

  /**
   * Get publisher by email
   */
  static async getPublisherByEmail(email: string) {
    const publisher = await db.select()
      .from(publishers)
      .where(eq(publishers.email, email))
      .limit(1);
    
    return publisher[0] || null;
  }

  /**
   * Get website by domain
   */
  static async getWebsiteByDomain(domain: string) {
    const website = await db.select()
      .from(websites)
      .where(eq(websites.domain, domain.toLowerCase()))
      .limit(1);
    
    return website[0] || null;
  }

  /**
   * Update publisher verification status
   */
  static async updatePublisherVerification(publisherId: string, emailVerified: boolean) {
    await db.update(publishers)
      .set({ emailVerified, updatedAt: new Date() })
      .where(eq(publishers.id, publisherId));
  }

  /**
   * Update publisher status
   */
  static async updatePublisherStatus(publisherId: string, status: 'active' | 'pending' | 'suspended') {
    await db.update(publishers)
      .set({ status, updatedAt: new Date() })
      .where(eq(publishers.id, publisherId));
  }
}