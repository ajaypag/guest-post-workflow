import { describe, expect, test, beforeEach } from '@jest/globals';
import { setupTestDatabase, registerTestData } from '../utils/testDatabase';
import { PublisherFactory } from '../factories/publisherFactory';
import { publishers } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';

describe('Publisher Basic Integration Tests', () => {
  let testDb: any;

  beforeEach(async () => {
    testDb = await setupTestDatabase();
  });

  test('should create and retrieve publisher', async () => {
    const publisherData = PublisherFactory.createPublisher({
      companyName: 'Integration Test Publisher',
    });

    const [publisher] = await testDb.insert(publishers).values(publisherData).returning();
    registerTestData('publishers', publisher.id);

    expect(publisher.id).toBe(publisherData.id);
    expect(publisher.companyName).toBe('Integration Test Publisher');
    expect(publisher.status).toBe('active');

    // Verify we can retrieve it
    const [retrieved] = await testDb
      .select()
      .from(publishers)
      .where(publishers.id.eq(publisher.id));

    expect(retrieved).toEqual(publisher);
  });

  test('should create and retrieve website', async () => {
    const websiteData = PublisherFactory.createWebsite({
      domain: 'integration-test.com',
      normalizedDomain: 'integration-test.com',
    });

    const [website] = await testDb.insert(websites).values(websiteData).returning();
    registerTestData('websites', website.id);

    expect(website.id).toBe(websiteData.id);
    expect(website.domain).toBe('integration-test.com');
    expect(website.normalizedDomain).toBe('integration-test.com');

    // Verify we can retrieve it
    const [retrieved] = await testDb
      .select()
      .from(websites)
      .where(websites.id.eq(website.id));

    expect(retrieved).toEqual(website);
  });

  test('should enforce domain normalization uniqueness', async () => {
    const website1Data = PublisherFactory.createWebsite({
      domain: 'example.com',
      normalizedDomain: 'example.com',
    });

    const website2Data = PublisherFactory.createWebsite({
      domain: 'www.example.com',
      normalizedDomain: 'example.com', // Same normalized domain
    });

    // First website should succeed
    const [website1] = await testDb.insert(websites).values(website1Data).returning();
    registerTestData('websites', website1.id);

    // Second website should fail due to unique constraint
    await expect(
      testDb.insert(websites).values(website2Data).returning()
    ).rejects.toThrow();
  });

  test('should handle email uniqueness constraint', async () => {
    const email = 'duplicate@test.com';
    
    const publisher1Data = PublisherFactory.createPublisher({ email });
    const publisher2Data = PublisherFactory.createPublisher({ email });

    // First publisher should succeed
    const [publisher1] = await testDb.insert(publishers).values(publisher1Data).returning();
    registerTestData('publishers', publisher1.id);

    // Second publisher with same email should fail
    await expect(
      testDb.insert(publishers).values(publisher2Data).returning()
    ).rejects.toThrow();
  });
});