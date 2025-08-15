import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/publisher/offerings/route';
import { PublisherFactory } from '../../../factories/publisherFactory';
import { setupTestDatabase, getTestDb } from '../../../utils/testDatabase';
import { publishers } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { AuthServiceServer } from '@/lib/auth-server';

// Mock the auth service
jest.mock('@/lib/auth-server', () => ({
  AuthServiceServer: {
    getSession: jest.fn(),
  },
}));

describe('/api/publisher/offerings', () => {
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

  describe('POST /api/publisher/offerings', () => {
    test('should create offering with valid publisher session', async () => {
      // Mock valid publisher session
      (AuthServiceServer.getSession as jest.Mock).mockResolvedValue({
        userType: 'publisher',
        publisherId: testPublisherId,
      });

      const requestBody = {
        publisherRelationshipId: testWebsiteId, // Using website ID as relationship ID for this test
        offeringType: 'guest_post',
        basePrice: 500,
        currency: 'USD',
        turnaroundDays: 7,
        contentRequirements: {
          minWordCount: 1000,
          requiresImages: true,
        },
        restrictions: {
          noGambling: true,
        },
      };

      const request = new NextRequest('http://localhost:3002/api/publisher/offerings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.offering).toMatchObject({
        offeringType: 'guest_post',
        basePrice: '500', // Should be string for DECIMAL
        currency: 'USD',
        turnaroundDays: 7,
      });
    });

    test('should reject request with no session', async () => {
      (AuthServiceServer.getSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3002/api/publisher/offerings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offeringType: 'guest_post',
          basePrice: 500,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject request with invalid userType', async () => {
      (AuthServiceServer.getSession as jest.Mock).mockResolvedValue({
        userType: 'internal', // Wrong user type
        publisherId: testPublisherId,
      });

      const request = new NextRequest('http://localhost:3002/api/publisher/offerings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offeringType: 'guest_post',
          basePrice: 500,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject request with missing publisherId', async () => {
      (AuthServiceServer.getSession as jest.Mock).mockResolvedValue({
        userType: 'publisher',
        publisherId: null,
      });

      const request = new NextRequest('http://localhost:3002/api/publisher/offerings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offeringType: 'guest_post',
          basePrice: 500,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid publisher session');
    });

    test('should reject request with missing required fields', async () => {
      (AuthServiceServer.getSession as jest.Mock).mockResolvedValue({
        userType: 'publisher',
        publisherId: testPublisherId,
      });

      const request = new NextRequest('http://localhost:3002/api/publisher/offerings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          offeringType: 'guest_post',
          // Missing basePrice and publisherRelationshipId
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    test('should reject request with invalid JSON', async () => {
      (AuthServiceServer.getSession as jest.Mock).mockResolvedValue({
        userType: 'publisher',
        publisherId: testPublisherId,
      });

      const request = new NextRequest('http://localhost:3002/api/publisher/offerings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    test('should use default values for optional fields', async () => {
      (AuthServiceServer.getSession as jest.Mock).mockResolvedValue({
        userType: 'publisher',
        publisherId: testPublisherId,
      });

      const requestBody = {
        publisherRelationshipId: testWebsiteId,
        offeringType: 'link_insertion',
        basePrice: 200,
        // No optional fields provided
      };

      const request = new NextRequest('http://localhost:3002/api/publisher/offerings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.offering).toMatchObject({
        currency: 'USD',
        turnaroundDays: 7,
        isActive: true,
        currentAvailability: 'available',
      });
    });
  });
});