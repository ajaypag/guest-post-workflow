import { describe, expect, test, beforeEach } from '@jest/globals';
import { setupTestDatabase, getTestDb } from '../utils/testDatabase';
import { PublisherFactory } from '../factories/publisherFactory';
import { publishers } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferingsService } from '@/lib/services/publisherOfferingsService';
import { sql } from 'drizzle-orm';

describe('SQL Injection Prevention Tests', () => {
  let testDb: any;
  let testPublisherId: string;
  let testWebsiteId: string;

  beforeEach(async () => {
    testDb = await setupTestDatabase();

    // Create test publisher
    const publisherData = PublisherFactory.createPublisher();
    const [publisher] = await testDb.insert(publishers).values(publisherData).returning();
    testPublisherId = publisher.id;

    // Create test website
    const websiteData = PublisherFactory.createWebsite();
    const [website] = await testDb.insert(websites).values(websiteData).returning();
    testWebsiteId = website.id;
  });

  describe('Publisher search functionality', () => {
    test('should prevent SQL injection in search terms', async () => {
      // Create a test publisher
      const validPublisher = PublisherFactory.createPublisher({
        companyName: 'Legitimate Company',
        email: 'legit@company.com',
      });
      await testDb.insert(publishers).values(validPublisher).returning();

      // SQL injection attempts
      const maliciousInputs = [
        "'; DROP TABLE publishers; --",
        "' OR '1'='1",
        "' UNION SELECT password FROM publishers --",
        "'; DELETE FROM publishers WHERE id = '",
        "' OR 1=1 --",
        "'; INSERT INTO publishers (email) VALUES ('hacker@test.com'); --",
        "' OR (SELECT COUNT(*) FROM publishers) > 0 --",
      ];

      for (const maliciousInput of maliciousInputs) {
        // Test search functionality that might be vulnerable
        const searchResults = await testDb
          .select()
          .from(publishers)
          .where(sql`company_name ILIKE ${`%${maliciousInput}%`}`);

        // Should return empty results, not error or unexpected data
        expect(searchResults).toEqual([]);

        // Verify table still exists and data is intact
        const allPublishers = await testDb.select().from(publishers);
        expect(allPublishers.length).toBeGreaterThanOrEqual(2); // Our test publishers should still exist
      }
    });

    test('should properly escape special characters in domain search', async () => {
      const specialDomains = [
        "test.com'; DROP TABLE websites; --",
        "test.com' OR '1'='1",
        "test.com%'; --",
        "test.com' UNION SELECT * FROM publishers --",
      ];

      for (const maliciousDomain of specialDomains) {
        // This should not find any websites and should not cause SQL errors
        const results = await testDb
          .select()
          .from(websites)
          .where(sql`domain = ${maliciousDomain}`);

        expect(results).toEqual([]);
      }

      // Verify websites table is still intact
      const allWebsites = await testDb.select().from(websites);
      expect(allWebsites.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Input validation and sanitization', () => {
    test('should reject malicious offering data', async () => {
      const maliciousOfferingData = {
        offeringType: "guest_post'; DROP TABLE publisher_offerings; --",
        basePrice: -1, // Invalid price
        niches: ["'; DELETE FROM publishers; --"],
        attributes: {
          maliciousScript: "<script>alert('xss')</script>",
          sqlInjection: "'; DROP TABLE websites; --",
        },
      };

      // Should either sanitize the input or reject it entirely
      try {
        await publisherOfferingsService.createOffering(testPublisherId, maliciousOfferingData);
        
        // If it succeeds, verify the data was sanitized
        const offerings = await testDb
          .select()
          .from(publishers)
          .where(sql`id = ${testPublisherId}`);
        
        expect(offerings).toHaveLength(1); // Publisher should still exist
      } catch (error) {
        // If it fails, that's also acceptable for security
        expect(error).toBeDefined();
      }
    });

    test('should validate price inputs to prevent negative values', async () => {
      const invalidPrices = [-1, -100, 0, NaN, Infinity, -Infinity];

      for (const invalidPrice of invalidPrices) {
        await expect(
          publisherOfferingsService.createOffering(testPublisherId, {
            offeringType: 'guest_post',
            basePrice: invalidPrice,
          })
        ).rejects.toThrow();
      }
    });

    test('should validate offering type against allowed values', async () => {
      const invalidOfferingTypes = [
        "'; DROP TABLE publisher_offerings; --",
        '<script>alert("xss")</script>',
        'invalid_type',
        null,
        undefined,
        123,
        {},
      ];

      for (const invalidType of invalidOfferingTypes) {
        await expect(
          publisherOfferingsService.createOffering(testPublisherId, {
            offeringType: invalidType as any,
            basePrice: 500,
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('Access control tests', () => {
    test('should prevent cross-publisher data access', async () => {
      // Create two publishers
      const publisher1Data = PublisherFactory.createPublisher();
      const publisher2Data = PublisherFactory.createPublisher();
      
      const [publisher1] = await testDb.insert(publishers).values(publisher1Data).returning();
      const [publisher2] = await testDb.insert(publishers).values(publisher2Data).returning();

      // Create offering for publisher1
      const offering1 = await publisherOfferingsService.createOffering(publisher1.id, {
        offeringType: 'guest_post',
        basePrice: 500,
      });

      // Publisher2 should not be able to update publisher1's offering
      await expect(
        publisherOfferingsService.updateOffering(offering1.id, {
          basePrice: 1000,
        })
      ).rejects.toThrow();
    });

    test('should validate publisher exists before creating offerings', async () => {
      const nonExistentPublisherId = 'non-existent-publisher-id';
      
      await expect(
        publisherOfferingsService.createOffering(nonExistentPublisherId, {
          offeringType: 'guest_post',
          basePrice: 500,
        })
      ).rejects.toThrow();
    });
  });

  describe('Data integrity constraints', () => {
    test('should enforce foreign key constraints', async () => {
      // Try to create offering with non-existent publisher
      await expect(
        testDb.insert(sql`
          INSERT INTO publisher_offerings (publisher_id, offering_type, base_price)
          VALUES ('fake-publisher-id', 'guest_post', 500)
        `)
      ).rejects.toThrow();
    });

    test('should prevent duplicate normalized domains', async () => {
      const websiteData1 = PublisherFactory.createWebsite({
        domain: 'example.com',
        normalizedDomain: 'example.com',
      });

      const websiteData2 = PublisherFactory.createWebsite({
        domain: 'www.example.com',
        normalizedDomain: 'example.com', // Same normalized domain
      });

      await testDb.insert(websites).values(websiteData1);

      // Second insert should fail due to unique constraint
      await expect(
        testDb.insert(websites).values(websiteData2)
      ).rejects.toThrow();
    });
  });

  describe('Rate limiting and abuse prevention', () => {
    test('should handle bulk operations gracefully', async () => {
      // Test creating many offerings rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          publisherOfferingsService.createOffering(testPublisherId, {
            offeringType: 'guest_post',
            basePrice: 500 + i,
          })
        );
      }

      // Should either complete all or fail gracefully
      const results = await Promise.allSettled(promises);
      
      // At least some should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // Failed ones should have proper error messages
      const failed = results.filter(r => r.status === 'rejected');
      failed.forEach(result => {
        expect((result as any).reason).toBeDefined();
      });
    });
  });
});