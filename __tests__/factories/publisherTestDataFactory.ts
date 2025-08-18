/**
 * Test Data Factory for Publisher Workflow System
 * Creates consistent test data for all publisher-related tests
 */

import { randomUUID } from 'crypto';
import { testUtils } from '../setup';

export interface TestPublisher {
  id: string;
  email: string;
  contactName: string;
  companyName: string;
  status: 'active' | 'inactive' | 'pending';
  password: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestWebsite {
  id: string;
  domain: string;
  normalizedDomain: string;
  domainRating: number;
  totalTraffic: number;
  guestPostCost: number;
  niches: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TestOrder {
  id: string;
  clientId: string;
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed';
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestOrderLineItem {
  id: string;
  orderId: string;
  clientId: string;
  targetPageUrl: string;
  anchorText: string;
  assignedDomain?: string;
  assignedDomainId?: string;
  publisherId?: string;
  publisherOfferingId?: string;
  publisherPrice?: number;
  platformFee?: number;
  publisherStatus?: 'pending' | 'notified' | 'accepted' | 'rejected' | 'in_progress' | 'submitted' | 'completed';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  assignedAt?: Date;
  assignedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPublisherOffering {
  id: string;
  publisherId: string;
  offeringType: 'guest_post' | 'link_insertion' | 'content_creation';
  basePrice: number;
  turnaroundDays: number;
  minWordCount?: number;
  maxWordCount?: number;
  niches: string[];
  languages: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPublisherRelationship {
  id: string;
  publisherId: string;
  offeringId?: string;
  websiteId: string;
  isPrimary: boolean;
  isActive: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  priorityRank: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestClient {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export class PublisherTestDataFactory {
  private static sequence = 0;

  private static getNextSequence(): number {
    return ++this.sequence;
  }

  static createPublisher(overrides: Partial<TestPublisher> = {}): TestPublisher {
    const seq = this.getNextSequence();
    const testId = testUtils.generateTestId();
    
    return {
      id: randomUUID(),
      email: `publisher-${seq}-${testId}@test.com`,
      contactName: `Test Publisher ${seq}`,
      companyName: `Test Publishing Co ${seq}`,
      status: 'active',
      password: 'testpublisher123',
      passwordHash: '$2a$10$hashed.password.here', // Mock bcrypt hash
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createWebsite(overrides: Partial<TestWebsite> = {}): TestWebsite {
    const seq = this.getNextSequence();
    const testId = testUtils.generateTestId();
    const domain = `test-${seq}-${testId}.com`;
    
    return {
      id: randomUUID(),
      domain,
      normalizedDomain: domain.toLowerCase(),
      domainRating: Math.floor(Math.random() * 100) + 1,
      totalTraffic: Math.floor(Math.random() * 100000) + 1000,
      guestPostCost: Math.floor(Math.random() * 50000) + 5000, // $50-$550 in cents
      niches: ['technology', 'business'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createClient(overrides: Partial<TestClient> = {}): TestClient {
    const seq = this.getNextSequence();
    const testId = testUtils.generateTestId();
    
    return {
      id: randomUUID(),
      name: `Test Client ${seq}`,
      email: `client-${seq}-${testId}@test.com`,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createOrder(overrides: Partial<TestOrder> = {}): TestOrder {
    return {
      id: randomUUID(),
      clientId: randomUUID(),
      status: 'confirmed',
      totalAmount: Math.floor(Math.random() * 100000) + 10000, // $100-$1100 in cents
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createOrderLineItem(overrides: Partial<TestOrderLineItem> = {}): TestOrderLineItem {
    const seq = this.getNextSequence();
    
    return {
      id: randomUUID(),
      orderId: randomUUID(),
      clientId: randomUUID(),
      targetPageUrl: `https://example-${seq}.com/target-page`,
      anchorText: `Test Anchor Text ${seq}`,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createPublisherOffering(overrides: Partial<TestPublisherOffering> = {}): TestPublisherOffering {
    return {
      id: randomUUID(),
      publisherId: randomUUID(),
      offeringType: 'guest_post',
      basePrice: Math.floor(Math.random() * 50000) + 5000, // $50-$550 in cents
      turnaroundDays: Math.floor(Math.random() * 14) + 1, // 1-14 days
      minWordCount: 500,
      maxWordCount: 2000,
      niches: ['technology', 'business', 'marketing'],
      languages: ['en'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createPublisherRelationship(overrides: Partial<TestPublisherRelationship> = {}): TestPublisherRelationship {
    return {
      id: randomUUID(),
      publisherId: randomUUID(),
      websiteId: randomUUID(),
      isPrimary: true,
      isActive: true,
      verificationStatus: 'verified',
      priorityRank: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Creates a complete publisher setup with website and offering
   */
  static async createCompletePublisherSetup(): Promise<{
    publisher: TestPublisher;
    website: TestWebsite;
    offering: TestPublisherOffering;
    relationship: TestPublisherRelationship;
  }> {
    const publisher = this.createPublisher();
    const website = this.createWebsite();
    const offering = this.createPublisherOffering({ publisherId: publisher.id });
    const relationship = this.createPublisherRelationship({
      publisherId: publisher.id,
      websiteId: website.id,
      offeringId: offering.id
    });

    return { publisher, website, offering, relationship };
  }

  /**
   * Creates an order ready for publisher assignment
   */
  static async createOrderForAssignment(): Promise<{
    client: TestClient;
    order: TestOrder;
    lineItem: TestOrderLineItem;
  }> {
    const client = this.createClient();
    const order = this.createOrder({ clientId: client.id });
    const lineItem = this.createOrderLineItem({
      orderId: order.id,
      clientId: client.id
    });

    return { client, order, lineItem };
  }

  /**
   * Creates a complete order-to-publisher scenario
   */
  static async createOrderWithPublisherScenario(): Promise<{
    publisher: TestPublisher;
    website: TestWebsite;
    offering: TestPublisherOffering;
    relationship: TestPublisherRelationship;
    client: TestClient;
    order: TestOrder;
    lineItem: TestOrderLineItem;
  }> {
    const publisherSetup = await this.createCompletePublisherSetup();
    const orderSetup = await this.createOrderForAssignment();

    return {
      ...publisherSetup,
      ...orderSetup
    };
  }
}

/**
 * Database helper methods for persisting test data
 */
export class TestDataPersistence {
  static async insertPublisher(publisher: TestPublisher): Promise<void> {
    await testUtils.query(`
      INSERT INTO publishers (
        id, email, contact_name, company_name, status, password_hash, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [
      publisher.id,
      publisher.email,
      publisher.contactName,
      publisher.companyName,
      publisher.status,
      publisher.passwordHash,
      publisher.createdAt,
      publisher.updatedAt
    ]);
  }

  static async insertWebsite(website: TestWebsite): Promise<void> {
    await testUtils.query(`
      INSERT INTO websites (
        id, domain, normalized_domain, domain_rating, total_traffic, guest_post_cost, niches, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `, [
      website.id,
      website.domain,
      website.normalizedDomain,
      website.domainRating,
      website.totalTraffic,
      website.guestPostCost,
      website.niches,
      website.createdAt,
      website.updatedAt
    ]);
  }

  static async insertClient(client: TestClient): Promise<void> {
    await testUtils.query(`
      INSERT INTO clients (
        id, name, email, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [
      client.id,
      client.name,
      client.email,
      client.status,
      client.createdAt,
      client.updatedAt
    ]);
  }

  static async insertOrder(order: TestOrder): Promise<void> {
    await testUtils.query(`
      INSERT INTO orders (
        id, client_id, status, total_amount, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [
      order.id,
      order.clientId,
      order.status,
      order.totalAmount,
      order.createdAt,
      order.updatedAt
    ]);
  }

  static async insertOrderLineItem(lineItem: TestOrderLineItem): Promise<void> {
    await testUtils.query(`
      INSERT INTO order_line_items (
        id, order_id, client_id, target_page_url, anchor_text, assigned_domain, assigned_domain_id,
        publisher_id, publisher_offering_id, publisher_price, platform_fee, publisher_status,
        status, assigned_at, assigned_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO NOTHING
    `, [
      lineItem.id,
      lineItem.orderId,
      lineItem.clientId,
      lineItem.targetPageUrl,
      lineItem.anchorText,
      lineItem.assignedDomain,
      lineItem.assignedDomainId,
      lineItem.publisherId,
      lineItem.publisherOfferingId,
      lineItem.publisherPrice,
      lineItem.platformFee,
      lineItem.publisherStatus,
      lineItem.status,
      lineItem.assignedAt,
      lineItem.assignedBy,
      lineItem.createdAt,
      lineItem.updatedAt
    ]);
  }

  static async insertPublisherOffering(offering: TestPublisherOffering): Promise<void> {
    await testUtils.query(`
      INSERT INTO publisher_offerings (
        id, publisher_id, offering_type, base_price, turnaround_days, min_word_count, max_word_count,
        niches, languages, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `, [
      offering.id,
      offering.publisherId,
      offering.offeringType,
      offering.basePrice,
      offering.turnaroundDays,
      offering.minWordCount,
      offering.maxWordCount,
      offering.niches,
      offering.languages,
      offering.isActive,
      offering.createdAt,
      offering.updatedAt
    ]);
  }

  static async insertPublisherRelationship(relationship: TestPublisherRelationship): Promise<void> {
    await testUtils.query(`
      INSERT INTO publisher_offering_relationships (
        id, publisher_id, offering_id, website_id, is_primary, is_active,
        verification_status, priority_rank, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, [
      relationship.id,
      relationship.publisherId,
      relationship.offeringId,
      relationship.websiteId,
      relationship.isPrimary,
      relationship.isActive,
      relationship.verificationStatus,
      relationship.priorityRank,
      relationship.createdAt,
      relationship.updatedAt
    ]);
  }

  /**
   * Persists a complete publisher scenario to the database
   */
  static async persistCompleteScenario(scenario: Awaited<ReturnType<typeof PublisherTestDataFactory.createOrderWithPublisherScenario>>): Promise<void> {
    // Insert in correct order to respect foreign key constraints
    await this.insertClient(scenario.client);
    await this.insertPublisher(scenario.publisher);
    await this.insertWebsite(scenario.website);
    await this.insertOrder(scenario.order);
    await this.insertPublisherOffering(scenario.offering);
    await this.insertPublisherRelationship(scenario.relationship);
    await this.insertOrderLineItem(scenario.lineItem);
  }
}