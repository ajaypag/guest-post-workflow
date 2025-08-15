import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { PublisherOfferingsService } from '@/lib/services/publisherOfferingsService';
import { PublisherFactory } from '../../factories/publisherFactory';
import { setupTestDatabase, getTestDb, registerTestData } from '../../utils/testDatabase';
import { 
  publisherOfferings,
  publisherOfferingRelationships,
  publisherPricingRules,
  OFFERING_TYPES
} from '@/lib/db/publisherSchemaActual';
import { publishers } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';

// Mock the database connection to use our test database
jest.mock('@/lib/db/connection');

describe('PublisherOfferingsService', () => {
  let service: PublisherOfferingsService;
  let testDb: any;
  let testPublisherId: string;
  let testWebsiteId: string;

  beforeEach(async () => {
    testDb = await setupTestDatabase();
    
    // Mock the db connection
    const { db } = require('@/lib/db/connection');
    Object.assign(db, testDb);
    
    service = new PublisherOfferingsService();

    // Create test publisher
    const publisherData = PublisherFactory.createPublisher();
    const [publisher] = await testDb.insert(publishers).values(publisherData).returning();
    testPublisherId = publisher.id;
    registerTestData('publishers', publisher.id);

    // Create test website
    const websiteData = PublisherFactory.createWebsite();
    const [website] = await testDb.insert(websites).values(websiteData).returning();
    testWebsiteId = website.id;
    registerTestData('websites', website.id);
  });

  describe('createOffering', () => {
    test('should create a new offering successfully', async () => {
      const offeringData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (offeringData as any).publisherId; // Remove as it's passed separately

      const result = await service.createOffering(testPublisherId, offeringData);

      expect(result).toMatchObject({
        publisherId: testPublisherId,
        offeringType: OFFERING_TYPES.GUEST_POST,
        basePrice: 500,
        turnaroundDays: 7,
        isActive: true,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    test('should create offering with default values', async () => {
      const minimalOffering = {
        offeringType: OFFERING_TYPES.LINK_INSERTION,
        basePrice: 100,
      };

      const result = await service.createOffering(testPublisherId, minimalOffering);

      expect(result).toMatchObject({
        publisherId: testPublisherId,
        offeringType: OFFERING_TYPES.LINK_INSERTION,
        basePrice: 100,
        isActive: true,
        languages: ['en'],
      });
    });

    test('should throw error for invalid publisher ID', async () => {
      const offeringData = PublisherFactory.createGuestPostOffering('invalid-publisher-id');
      delete (offeringData as any).publisherId;

      await expect(
        service.createOffering('invalid-publisher-id', offeringData)
      ).rejects.toThrow();
    });
  });

  describe('updateOffering', () => {
    test('should update existing offering', async () => {
      // Create offering first
      const offeringData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (offeringData as any).publisherId;
      const offering = await service.createOffering(testPublisherId, offeringData);

      // Update the offering
      const updates = {
        basePrice: 600,
        turnaroundDays: 10,
        isActive: false,
      };

      const result = await service.updateOffering(offering.id, updates);

      expect(result).toMatchObject({
        id: offering.id,
        basePrice: 600,
        turnaroundDays: 10,
        isActive: false,
      });
      expect(result.updatedAt).not.toEqual(offering.updatedAt);
    });

    test('should throw error for non-existent offering', async () => {
      await expect(
        service.updateOffering('non-existent-id', { basePrice: 500 })
      ).rejects.toThrow();
    });
  });

  describe('createRelationship', () => {
    test('should create publisher-website relationship', async () => {
      // Create offering first
      const offeringData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (offeringData as any).publisherId;
      const offering = await service.createOffering(testPublisherId, offeringData);

      const result = await service.createRelationship(
        testPublisherId,
        testWebsiteId,
        offering.id,
        {
          isPrimary: true,
          relationshipType: 'owner',
          verificationStatus: 'verified',
        }
      );

      expect(result).toMatchObject({
        publisherId: testPublisherId,
        websiteId: testWebsiteId,
        offeringId: offering.id,
        isPrimary: true,
        relationshipType: 'owner',
        verificationStatus: 'verified',
        isActive: true,
      });
    });

    test('should create relationship with default values', async () => {
      const offeringData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (offeringData as any).publisherId;
      const offering = await service.createOffering(testPublisherId, offeringData);

      const result = await service.createRelationship(
        testPublisherId,
        testWebsiteId,
        offering.id
      );

      expect(result).toMatchObject({
        isPrimary: false,
        isActive: true,
        relationshipType: 'contact',
        verificationStatus: 'claimed',
        priorityRank: 100,
        isPreferred: false,
      });
    });
  });

  describe('getPublisherWebsites', () => {
    test('should return websites managed by publisher', async () => {
      // Create offering and relationship
      const offeringData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (offeringData as any).publisherId;
      const offering = await service.createOffering(testPublisherId, offeringData);
      
      await service.createRelationship(testPublisherId, testWebsiteId, offering.id);

      const result = await service.getPublisherWebsites(testPublisherId);

      expect(result).toHaveLength(1);
      expect(result[0].website.id).toBe(testWebsiteId);
      expect(result[0].relationship.publisherId).toBe(testPublisherId);
    });

    test('should return empty array for publisher with no websites', async () => {
      const result = await service.getPublisherWebsites(testPublisherId);
      expect(result).toHaveLength(0);
    });

    test('should only return active relationships', async () => {
      const offeringData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (offeringData as any).publisherId;
      const offering = await service.createOffering(testPublisherId, offeringData);
      
      // Create inactive relationship
      await service.createRelationship(testPublisherId, testWebsiteId, offering.id, {
        isActive: false,
      });

      const result = await service.getPublisherWebsites(testPublisherId);
      expect(result).toHaveLength(0);
    });
  });

  describe('getWebsiteOfferings', () => {
    test('should return offerings for a website', async () => {
      const offeringData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (offeringData as any).publisherId;
      const offering = await service.createOffering(testPublisherId, offeringData);
      
      await service.createRelationship(testPublisherId, testWebsiteId, offering.id);

      const result = await service.getWebsiteOfferings(testWebsiteId);

      expect(result).toHaveLength(1);
      expect(result[0].offering.id).toBe(offering.id);
      expect(result[0].publisher.id).toBe(testPublisherId);
    });

    test('should filter by offering type', async () => {
      // Create guest post offering
      const guestPostData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (guestPostData as any).publisherId;
      const guestPost = await service.createOffering(testPublisherId, guestPostData);
      await service.createRelationship(testPublisherId, testWebsiteId, guestPost.id);

      // Create link insertion offering
      const linkInsertionData = PublisherFactory.createLinkInsertionOffering(testPublisherId);
      delete (linkInsertionData as any).publisherId;
      const linkInsertion = await service.createOffering(testPublisherId, linkInsertionData);
      await service.createRelationship(testPublisherId, testWebsiteId, linkInsertion.id);

      const guestPostResults = await service.getOfferingsByType(testWebsiteId, 'GUEST_POST');
      const linkInsertionResults = await service.getOfferingsByType(testWebsiteId, 'LINK_INSERTION');

      expect(guestPostResults).toHaveLength(1);
      expect(guestPostResults[0].offering.offeringType).toBe(OFFERING_TYPES.GUEST_POST);
      
      expect(linkInsertionResults).toHaveLength(1);
      expect(linkInsertionResults[0].offering.offeringType).toBe(OFFERING_TYPES.LINK_INSERTION);
    });
  });

  describe('calculatePrice', () => {
    test('should return base price with no rules', async () => {
      const offeringData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (offeringData as any).publisherId;
      const offering = await service.createOffering(testPublisherId, offeringData);

      const result = await service.calculatePrice(offering.id);

      expect(result).toMatchObject({
        basePrice: 500,
        finalPrice: 500,
        appliedRules: [],
      });
    });

    test('should apply pricing rules correctly', async () => {
      const offeringData = PublisherFactory.createGuestPostOffering(testPublisherId);
      delete (offeringData as any).publisherId;
      const offering = await service.createOffering(testPublisherId, offeringData);

      // Add a discount rule
      await service.addPricingRule(offering.id, {
        ruleType: 'discount',
        ruleName: 'Volume Discount',
        description: '10% discount for bulk orders',
        conditions: { minQuantity: 5 },
        actions: { discountPercent: 10 },
        priority: 1,
        isCumulative: false,
        autoApply: true,
        requiresApproval: false,
        isActive: true,
      });

      const resultWithoutRule = await service.calculatePrice(offering.id, { quantity: 2 });
      const resultWithRule = await service.calculatePrice(offering.id, { quantity: 5 });

      expect(resultWithoutRule.finalPrice).toBe(500);
      expect(resultWithRule.finalPrice).toBe(450); // 10% discount
      expect(resultWithRule.appliedRules).toHaveLength(1);
    });
  });

  describe('domain normalization', () => {
    test('should handle normalized domain matching', async () => {
      // This test would verify that domain normalization works correctly
      // by creating websites with different domain formats that should normalize to the same value
      const websiteData1 = PublisherFactory.createWebsite({
        domain: 'example.com',
        normalizedDomain: 'example.com',
      });
      
      const websiteData2 = PublisherFactory.createWebsite({
        domain: 'www.example.com',
        normalizedDomain: 'example.com', // Should normalize to same value
      });

      const [website1] = await testDb.insert(websites).values(websiteData1).returning();
      
      // This should fail if normalization is working correctly (duplicate normalized_domain)
      await expect(
        testDb.insert(websites).values(websiteData2).returning()
      ).rejects.toThrow();
    });
  });
});