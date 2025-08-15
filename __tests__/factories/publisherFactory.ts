import { v4 as uuidv4 } from 'uuid';
import { 
  type NewPublisherOffering,
  type NewPublisherOfferingRelationship,
  OFFERING_TYPES
} from '@/lib/db/publisherSchemaActual';
import { type Publisher } from '@/lib/db/accountSchema';
import { type Website } from '@/lib/db/websiteSchema';

export class PublisherFactory {
  static createPublisher(overrides: any = {}) {
    const id = uuidv4(); // Use proper UUID format
    return {
      id,
      email: `publisher-${id.slice(-8)}@test.com`,
      password: '$2b$10$test.hash.for.testing.purposes.only', // bcrypt hash for "testpassword"
      companyName: `Test Publisher Company ${id.slice(-4)}`,
      contactName: `Test Contact ${id.slice(-4)}`,
      status: 'active',
      emailVerified: true,
      ...overrides,
    };
  }

  static createWebsite(overrides: any = {}) {
    const domain = `test-${uuidv4().slice(0, 8)}.test`;
    const now = new Date();
    return {
      id: uuidv4(),
      airtableId: `airtable-${uuidv4()}`,
      domain,
      normalizedDomain: domain.toLowerCase(),
      domainRating: 50,
      totalTraffic: 10000,
      guestPostCost: '500.00',
      categories: ['technology'],
      niche: ['tech'],
      type: ['blog'],
      status: 'Active',
      hasGuestPost: true,
      airtableCreatedAt: now,
      airtableUpdatedAt: now,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  static createOffering(publisherId: string, overrides: Partial<NewPublisherOffering> = {}): NewPublisherOffering {
    return {
      publisherId,
      offeringType: OFFERING_TYPES.GUEST_POST,
      basePrice: 500,
      turnaroundDays: 7,
      minWordCount: 1000,
      maxWordCount: 2000,
      niches: ['technology', 'business'],
      languages: ['en'],
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
      isActive: true,
      ...overrides,
    };
  }

  static createOfferingRelationship(
    publisherId: string,
    offeringId: string,
    websiteId: string,
    overrides: Partial<NewPublisherOfferingRelationship> = {}
  ): NewPublisherOfferingRelationship {
    return {
      publisherId,
      offeringId,
      websiteId,
      isPrimary: false,
      isActive: true,
      customTerms: {},
      relationshipType: 'contact',
      verificationStatus: 'claimed',
      priorityRank: 100,
      isPreferred: false,
      ...overrides,
    };
  }

  static createGuestPostOffering(publisherId: string, overrides: Partial<NewPublisherOffering> = {}) {
    return this.createOffering(publisherId, {
      offeringType: OFFERING_TYPES.GUEST_POST,
      basePrice: 500,
      turnaroundDays: 7,
      minWordCount: 1000,
      maxWordCount: 2000,
      ...overrides,
    });
  }

  static createLinkInsertionOffering(publisherId: string, overrides: Partial<NewPublisherOffering> = {}) {
    return this.createOffering(publisherId, {
      offeringType: OFFERING_TYPES.LINK_INSERTION,
      basePrice: 200,
      turnaroundDays: 3,
      minWordCount: 0,
      maxWordCount: 0,
      ...overrides,
    });
  }

  static createTestUser(userType: 'internal' | 'publisher' = 'publisher', publisherId?: string) {
    return {
      id: uuidv4(),
      email: `test-user-${uuidv4().slice(0, 8)}@test.com`,
      userType,
      publisherId: userType === 'publisher' ? publisherId : undefined,
      isActive: true,
    };
  }

  static createMockSession(userType: 'internal' | 'publisher' = 'publisher', publisherId?: string) {
    return {
      user: this.createTestUser(userType, publisherId),
      userType,
      publisherId: userType === 'publisher' ? publisherId : undefined,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };
  }
}