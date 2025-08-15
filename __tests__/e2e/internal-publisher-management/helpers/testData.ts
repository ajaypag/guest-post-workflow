import { v4 as uuidv4 } from 'uuid';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
  userType: 'internal' | 'publisher' | 'account';
}

export interface TestPublisher {
  id: string;
  email: string;
  password: string;
  companyName: string;
  contactName: string;
  phone?: string;
  tier: 'basic' | 'standard' | 'premium';
  emailVerified: boolean;
  status: 'active' | 'pending' | 'suspended';
}

export interface TestWebsite {
  id: string;
  domain: string;
  normalizedDomain: string;
  domainRating: number;
  totalTraffic: number;
  guestPostCost: string;
  status: string;
  categories: string[];
}

export class TestDataFactory {
  static createInternalUser(overrides: Partial<TestUser> = {}): TestUser {
    const id = uuidv4();
    return {
      id,
      email: `internal-user-${id.slice(-8)}@linkio.com`,
      name: `Internal User ${id.slice(-4)}`,
      password: 'TestPassword123!',
      role: 'admin',
      userType: 'internal',
      ...overrides,
    };
  }

  static createPublisher(overrides: Partial<TestPublisher> = {}): TestPublisher {
    const id = uuidv4();
    return {
      id,
      email: `publisher-${id.slice(-8)}@test.com`,
      password: 'TestPassword123!',
      companyName: `Test Publisher Company ${id.slice(-4)}`,
      contactName: `Contact Name ${id.slice(-4)}`,
      phone: `+1-555-${Math.floor(Math.random() * 9000) + 1000}`,
      tier: 'standard',
      emailVerified: false,
      status: 'pending',
      ...overrides,
    };
  }

  static createWebsite(overrides: Partial<TestWebsite> = {}): TestWebsite {
    const id = uuidv4();
    const domain = `test-site-${id.slice(-8)}.com`;
    return {
      id,
      domain,
      normalizedDomain: domain.toLowerCase(),
      domainRating: Math.floor(Math.random() * 100) + 1,
      totalTraffic: Math.floor(Math.random() * 100000) + 1000,
      guestPostCost: '500.00',
      status: 'Active',
      categories: ['technology', 'business'],
      ...overrides,
    };
  }

  static createOffering(publisherId: string, websiteId: string, overrides: any = {}) {
    return {
      id: uuidv4(),
      publisherId,
      websiteId,
      offeringType: 'guest_post',
      basePrice: 500,
      turnaroundDays: 7,
      minWordCount: 1000,
      maxWordCount: 2000,
      niches: ['technology', 'business'],
      languages: ['en'],
      isActive: true,
      ...overrides,
    };
  }

  static createOfferingRelationship(publisherId: string, offeringId: string, websiteId: string, overrides: any = {}) {
    return {
      id: uuidv4(),
      publisherId,
      offeringId,
      websiteId,
      isPrimary: false,
      isActive: true,
      relationshipType: 'owner',
      verificationStatus: 'verified',
      priorityRank: 100,
      isPreferred: false,
      ...overrides,
    };
  }
}

export const CREDENTIALS = {
  INTERNAL_ADMIN: {
    email: 'ajay@outreachlabs.com',
    password: 'FA64!I$nrbCauS^d',
  },
  TEST_PUBLISHER: {
    email: 'test-publisher@example.com',
    password: 'TestPassword123!',
  },
};

export const TEST_SCENARIOS = {
  PUBLISHER_MANAGEMENT: {
    VERIFIED_PUBLISHER: TestDataFactory.createPublisher({
      emailVerified: true,
      status: 'active',
      tier: 'premium',
    }),
    PENDING_PUBLISHER: TestDataFactory.createPublisher({
      emailVerified: false,
      status: 'pending',
      tier: 'standard',
    }),
    SUSPENDED_PUBLISHER: TestDataFactory.createPublisher({
      emailVerified: true,
      status: 'suspended',
      tier: 'basic',
    }),
  },
  WEBSITES: {
    HIGH_DR_WEBSITE: TestDataFactory.createWebsite({
      domainRating: 85,
      totalTraffic: 500000,
      guestPostCost: '1500.00',
    }),
    MEDIUM_DR_WEBSITE: TestDataFactory.createWebsite({
      domainRating: 50,
      totalTraffic: 50000,
      guestPostCost: '500.00',
    }),
    LOW_DR_WEBSITE: TestDataFactory.createWebsite({
      domainRating: 20,
      totalTraffic: 5000,
      guestPostCost: '200.00',
    }),
  },
};

export const API_ENDPOINTS = {
  PUBLISHER: {
    LIST: '/api/publisher',
    DETAIL: (id: string) => `/api/publisher/${id}`,
    CREATE: '/api/publisher',
    UPDATE: (id: string) => `/api/publisher/${id}`,
    DELETE: (id: string) => `/api/publisher/${id}`,
    VERIFY: (id: string) => `/api/publisher/${id}/verify`,
  },
  OFFERINGS: {
    LIST: (publisherId: string) => `/api/publisher/${publisherId}/offerings`,
    CREATE: (publisherId: string) => `/api/publisher/${publisherId}/offerings`,
    UPDATE: (publisherId: string, offeringId: string) => `/api/publisher/${publisherId}/offerings/${offeringId}`,
  },
  WEBSITES: {
    LIST: '/api/websites',
    DETAIL: (id: string) => `/api/websites/${id}`,
    PUBLISHERS: (id: string) => `/api/websites/${id}/publishers`,
  },
};