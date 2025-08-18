/**
 * Unit Tests for PublisherOrderService
 * Tests core business logic for publisher order management
 */

import { PublisherOrderService } from '@/lib/services/publisherOrderService';
import { PublisherTestDataFactory, TestDataPersistence } from '../factories/publisherTestDataFactory';
import { testUtils } from '../setup';

describe('PublisherOrderService', () => {
  describe('findPublisherForDomain', () => {
    it('should find verified publisher for domain', async () => {
      // Arrange
      const scenario = await PublisherTestDataFactory.createOrderWithPublisherScenario();
      await TestDataPersistence.persistCompleteScenario(scenario);
      
      // Create a bulk analysis domain for the website
      const domainResult = await testUtils.query(`
        INSERT INTO bulk_analysis_domains (id, domain, website_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
      `, [testUtils.generateTestId(), scenario.website.domain, scenario.website.id]);
      
      const domainId = domainResult.rows[0].id;

      // Act
      const result = await PublisherOrderService.findPublisherForDomain(domainId);

      // Assert
      expect(result.publisherId).toBe(scenario.publisher.id);
      expect(result.offeringId).toBe(scenario.offering.id);
      expect(result.publisherPrice).toBeGreaterThan(0);
      expect(result.publisherPrice).toBe(scenario.offering.basePrice * 100); // Convert to cents
    });

    it('should return null when no publisher exists for domain', async () => {
      // Arrange
      const website = PublisherTestDataFactory.createWebsite();
      await TestDataPersistence.insertWebsite(website);
      
      const domainResult = await testUtils.query(`
        INSERT INTO bulk_analysis_domains (id, domain, website_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
      `, [testUtils.generateTestId(), website.domain, website.id]);
      
      const domainId = domainResult.rows[0].id;

      // Act
      const result = await PublisherOrderService.findPublisherForDomain(domainId);

      // Assert
      expect(result.publisherId).toBeNull();
      expect(result.offeringId).toBeNull();
      expect(result.publisherPrice).toBeNull();
    });

    it('should prioritize verified publishers over unverified', async () => {
      // Arrange
      const website = PublisherTestDataFactory.createWebsite();
      const verifiedPublisher = PublisherTestDataFactory.createPublisher();
      const unverifiedPublisher = PublisherTestDataFactory.createPublisher();
      
      const verifiedOffering = PublisherTestDataFactory.createPublisherOffering({
        publisherId: verifiedPublisher.id,
        basePrice: 30000 // $300
      });
      
      const unverifiedOffering = PublisherTestDataFactory.createPublisherOffering({
        publisherId: unverifiedPublisher.id,
        basePrice: 20000 // $200 (cheaper)
      });
      
      const verifiedRelationship = PublisherTestDataFactory.createPublisherRelationship({
        publisherId: verifiedPublisher.id,
        websiteId: website.id,
        offeringId: verifiedOffering.id,
        verificationStatus: 'verified',
        priorityRank: 2
      });
      
      const unverifiedRelationship = PublisherTestDataFactory.createPublisherRelationship({
        publisherId: unverifiedPublisher.id,
        websiteId: website.id,
        offeringId: unverifiedOffering.id,
        verificationStatus: 'pending',
        priorityRank: 1 // Higher priority rank but not verified
      });

      // Persist all data
      await TestDataPersistence.insertWebsite(website);
      await TestDataPersistence.insertPublisher(verifiedPublisher);
      await TestDataPersistence.insertPublisher(unverifiedPublisher);
      await TestDataPersistence.insertPublisherOffering(verifiedOffering);
      await TestDataPersistence.insertPublisherOffering(unverifiedOffering);
      await TestDataPersistence.insertPublisherRelationship(verifiedRelationship);
      await TestDataPersistence.insertPublisherRelationship(unverifiedRelationship);
      
      const domainResult = await testUtils.query(`
        INSERT INTO bulk_analysis_domains (id, domain, website_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
      `, [testUtils.generateTestId(), website.domain, website.id]);
      
      const domainId = domainResult.rows[0].id;

      // Act
      const result = await PublisherOrderService.findPublisherForDomain(domainId);

      // Assert
      expect(result.publisherId).toBe(verifiedPublisher.id);
      expect(result.publisherPrice).toBe(30000); // Should get verified publisher despite higher price
    });

    it('should handle non-existent domain gracefully', async () => {
      // Act
      const result = await PublisherOrderService.findPublisherForDomain('non-existent-domain-id');

      // Assert
      expect(result.publisherId).toBeNull();
      expect(result.offeringId).toBeNull();
      expect(result.publisherPrice).toBeNull();
    });
  });

  describe('assignDomainWithPublisher', () => {
    it('should assign domain and publisher to line item', async () => {
      // Arrange
      const scenario = await PublisherTestDataFactory.createOrderWithPublisherScenario();
      await TestDataPersistence.persistCompleteScenario(scenario);
      
      const domainResult = await testUtils.query(`
        INSERT INTO bulk_analysis_domains (id, domain, website_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
      `, [testUtils.generateTestId(), scenario.website.domain, scenario.website.id]);
      
      const domainId = domainResult.rows[0].id;
      const adminUserId = testUtils.generateTestId();

      // Act
      const result = await PublisherOrderService.assignDomainWithPublisher(
        scenario.lineItem.id,
        domainId,
        adminUserId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify database updates
      const updatedLineItem = await testUtils.query(`
        SELECT assigned_domain_id, assigned_domain, publisher_id, publisher_offering_id,
               publisher_price, platform_fee, publisher_status, status, assigned_at, assigned_by
        FROM order_line_items
        WHERE id = $1
      `, [scenario.lineItem.id]);

      const lineItem = updatedLineItem.rows[0];
      expect(lineItem.assigned_domain_id).toBe(domainId);
      expect(lineItem.assigned_domain).toBe(scenario.website.domain);
      expect(lineItem.publisher_id).toBe(scenario.publisher.id);
      expect(lineItem.publisher_offering_id).toBe(scenario.offering.id);
      expect(lineItem.publisher_price).toBeGreaterThan(0);
      expect(lineItem.platform_fee).toBeGreaterThan(0);
      expect(lineItem.publisher_status).toBe('pending');
      expect(lineItem.status).toBe('assigned');
      expect(lineItem.assigned_at).toBeDefined();
      expect(lineItem.assigned_by).toBe(adminUserId);
    });

    it('should assign domain without publisher when no publisher available', async () => {
      // Arrange
      const orderSetup = await PublisherTestDataFactory.createOrderForAssignment();
      const website = PublisherTestDataFactory.createWebsite();
      
      await TestDataPersistence.insertClient(orderSetup.client);
      await TestDataPersistence.insertOrder(orderSetup.order);
      await TestDataPersistence.insertOrderLineItem(orderSetup.lineItem);
      await TestDataPersistence.insertWebsite(website);
      
      const domainResult = await testUtils.query(`
        INSERT INTO bulk_analysis_domains (id, domain, website_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
      `, [testUtils.generateTestId(), website.domain, website.id]);
      
      const domainId = domainResult.rows[0].id;
      const adminUserId = testUtils.generateTestId();

      // Act
      const result = await PublisherOrderService.assignDomainWithPublisher(
        orderSetup.lineItem.id,
        domainId,
        adminUserId
      );

      // Assert
      expect(result.success).toBe(true);

      // Verify database updates
      const updatedLineItem = await testUtils.query(`
        SELECT assigned_domain_id, assigned_domain, publisher_id, publisher_status, status
        FROM order_line_items
        WHERE id = $1
      `, [orderSetup.lineItem.id]);

      const lineItem = updatedLineItem.rows[0];
      expect(lineItem.assigned_domain_id).toBe(domainId);
      expect(lineItem.assigned_domain).toBe(website.domain);
      expect(lineItem.publisher_id).toBeNull();
      expect(lineItem.publisher_status).toBeNull();
      expect(lineItem.status).toBe('assigned');
    });

    it('should handle non-existent line item gracefully', async () => {
      // Arrange
      const domainId = testUtils.generateTestId();
      const adminUserId = testUtils.generateTestId();

      // Act
      const result = await PublisherOrderService.assignDomainWithPublisher(
        'non-existent-line-item',
        domainId,
        adminUserId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('calculatePlatformFee', () => {
    it('should calculate platform fee using publisher-specific commission', async () => {
      // Arrange
      const publisher = PublisherTestDataFactory.createPublisher();
      await TestDataPersistence.insertPublisher(publisher);
      
      // Create publisher-specific commission configuration
      await testUtils.query(`
        INSERT INTO commission_configurations (id, scope_type, scope_id, base_commission_percent, is_active, created_at, updated_at)
        VALUES ($1, 'publisher', $2, 25.0, true, NOW(), NOW())
      `, [testUtils.generateTestId(), publisher.id]);

      const amount = 10000; // $100

      // Act
      const result = await PublisherOrderService.calculatePlatformFee(publisher.id, amount);

      // Assert
      expect(result.commissionPercent).toBe(25);
      expect(result.platformFee).toBe(2500); // 25% of $100 = $25
    });

    it('should fall back to global commission when no publisher-specific config', async () => {
      // Arrange
      const publisher = PublisherTestDataFactory.createPublisher();
      await TestDataPersistence.insertPublisher(publisher);
      
      // Create global commission configuration
      await testUtils.query(`
        INSERT INTO commission_configurations (id, scope_type, scope_id, base_commission_percent, is_active, created_at, updated_at)
        VALUES ($1, 'global', NULL, 35.0, true, NOW(), NOW())
      `, [testUtils.generateTestId()]);

      const amount = 20000; // $200

      // Act
      const result = await PublisherOrderService.calculatePlatformFee(publisher.id, amount);

      // Assert
      expect(result.commissionPercent).toBe(35);
      expect(result.platformFee).toBe(7000); // 35% of $200 = $70
    });

    it('should use default 30% commission when no configuration exists', async () => {
      // Arrange
      const publisherId = testUtils.generateTestId();
      const amount = 15000; // $150

      // Act
      const result = await PublisherOrderService.calculatePlatformFee(publisherId, amount);

      // Assert
      expect(result.commissionPercent).toBe(30);
      expect(result.platformFee).toBe(4500); // 30% of $150 = $45
    });
  });

  describe('createEarningsForCompletedOrder', () => {
    it('should create earnings record for completed order', async () => {
      // Arrange
      const scenario = await PublisherTestDataFactory.createOrderWithPublisherScenario();
      scenario.lineItem.publisherId = scenario.publisher.id;
      scenario.lineItem.publisherPrice = 10000; // $100
      
      await TestDataPersistence.persistCompleteScenario(scenario);

      // Act
      const result = await PublisherOrderService.createEarningsForCompletedOrder(scenario.lineItem.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.earningId).toBeDefined();

      // Verify earnings record created
      const earnings = await testUtils.query(`
        SELECT publisher_id, order_line_item_id, order_id, earning_type, amount, gross_amount,
               platform_fee_amount, net_amount, status
        FROM publisher_earnings
        WHERE order_line_item_id = $1
      `, [scenario.lineItem.id]);

      expect(earnings.rows).toHaveLength(1);
      const earning = earnings.rows[0];
      expect(earning.publisher_id).toBe(scenario.publisher.id);
      expect(earning.order_line_item_id).toBe(scenario.lineItem.id);
      expect(earning.order_id).toBe(scenario.order.id);
      expect(earning.earning_type).toBe('order_completion');
      expect(earning.amount).toBe(10000);
      expect(earning.gross_amount).toBe(10000);
      expect(earning.platform_fee_amount).toBe(3000); // 30% of $100
      expect(earning.net_amount).toBe(7000); // $70
      expect(earning.status).toBe('pending');

      // Verify line item status updated
      const lineItemStatus = await testUtils.query(`
        SELECT publisher_status FROM order_line_items WHERE id = $1
      `, [scenario.lineItem.id]);
      
      expect(lineItemStatus.rows[0].publisher_status).toBe('completed');
    });

    it('should prevent duplicate earnings creation', async () => {
      // Arrange
      const scenario = await PublisherTestDataFactory.createOrderWithPublisherScenario();
      scenario.lineItem.publisherId = scenario.publisher.id;
      scenario.lineItem.publisherPrice = 10000;
      
      await TestDataPersistence.persistCompleteScenario(scenario);

      // Create first earnings record
      const firstResult = await PublisherOrderService.createEarningsForCompletedOrder(scenario.lineItem.id);
      expect(firstResult.success).toBe(true);

      // Act - Try to create duplicate
      const secondResult = await PublisherOrderService.createEarningsForCompletedOrder(scenario.lineItem.id);

      // Assert
      expect(secondResult.success).toBe(true);
      expect(secondResult.earningId).toBe(firstResult.earningId);

      // Verify only one earnings record exists
      const earnings = await testUtils.query(`
        SELECT COUNT(*) as count FROM publisher_earnings WHERE order_line_item_id = $1
      `, [scenario.lineItem.id]);
      
      expect(parseInt(earnings.rows[0].count)).toBe(1);
    });

    it('should handle line item without publisher', async () => {
      // Arrange
      const orderSetup = await PublisherTestDataFactory.createOrderForAssignment();
      await TestDataPersistence.insertClient(orderSetup.client);
      await TestDataPersistence.insertOrder(orderSetup.order);
      await TestDataPersistence.insertOrderLineItem(orderSetup.lineItem);

      // Act
      const result = await PublisherOrderService.createEarningsForCompletedOrder(orderSetup.lineItem.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('No publisher assigned');
    });

    it('should handle non-existent line item', async () => {
      // Act
      const result = await PublisherOrderService.createEarningsForCompletedOrder('non-existent-id');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Line item not found');
    });
  });

  describe('getPublisherPendingEarnings', () => {
    it('should calculate total pending earnings for publisher', async () => {
      // Arrange
      const publisher = PublisherTestDataFactory.createPublisher();
      await TestDataPersistence.insertPublisher(publisher);

      // Create multiple earnings records
      const earningsIds = [];
      for (let i = 0; i < 3; i++) {
        const earningResult = await testUtils.query(`
          INSERT INTO publisher_earnings (id, publisher_id, net_amount, status, created_at, updated_at)
          VALUES ($1, $2, $3, 'pending', NOW(), NOW())
          RETURNING id
        `, [testUtils.generateTestId(), publisher.id, (i + 1) * 1000]); // $10, $20, $30
        
        earningsIds.push(earningResult.rows[0].id);
      }

      // Act
      const totalPending = await PublisherOrderService.getPublisherPendingEarnings(publisher.id);

      // Assert
      expect(totalPending).toBe(6000); // $10 + $20 + $30 = $60
    });

    it('should exclude paid earnings from pending total', async () => {
      // Arrange
      const publisher = PublisherTestDataFactory.createPublisher();
      await TestDataPersistence.insertPublisher(publisher);

      // Create pending earnings
      await testUtils.query(`
        INSERT INTO publisher_earnings (id, publisher_id, net_amount, status, created_at, updated_at)
        VALUES ($1, $2, 5000, 'pending', NOW(), NOW())
      `, [testUtils.generateTestId(), publisher.id]);

      // Create paid earnings
      await testUtils.query(`
        INSERT INTO publisher_earnings (id, publisher_id, net_amount, status, created_at, updated_at)
        VALUES ($1, $2, 10000, 'paid', NOW(), NOW())
      `, [testUtils.generateTestId(), publisher.id]);

      // Act
      const totalPending = await PublisherOrderService.getPublisherPendingEarnings(publisher.id);

      // Assert
      expect(totalPending).toBe(5000); // Only pending earnings
    });

    it('should return 0 for publisher with no earnings', async () => {
      // Arrange
      const publisherId = testUtils.generateTestId();

      // Act
      const totalPending = await PublisherOrderService.getPublisherPendingEarnings(publisherId);

      // Assert
      expect(totalPending).toBe(0);
    });
  });

  describe('getPublisherOrderStats', () => {
    it('should return comprehensive publisher statistics', async () => {
      // Arrange
      const publisher = PublisherTestDataFactory.createPublisher();
      await TestDataPersistence.insertPublisher(publisher);

      // Create order line items with different statuses
      const lineItems = [
        { status: 'pending' },
        { status: 'accepted' },
        { status: 'in_progress' },
        { status: 'completed' },
        { status: 'completed' }
      ];

      for (const item of lineItems) {
        const lineItem = PublisherTestDataFactory.createOrderLineItem({
          publisherId: publisher.id,
          publisherStatus: item.status as any
        });
        await TestDataPersistence.insertOrderLineItem(lineItem);
      }

      // Create earnings records
      await testUtils.query(`
        INSERT INTO publisher_earnings (id, publisher_id, net_amount, status, created_at, updated_at)
        VALUES 
          ($1, $2, 5000, 'pending', NOW(), NOW()),
          ($3, $2, 7000, 'confirmed', NOW(), NOW()),
          ($4, $2, 10000, 'paid', NOW(), NOW())
      `, [
        testUtils.generateTestId(),
        publisher.id,
        testUtils.generateTestId(),
        testUtils.generateTestId()
      ]);

      // Act
      const stats = await PublisherOrderService.getPublisherOrderStats(publisher.id);

      // Assert
      expect(stats.totalOrders).toBe(5);
      expect(stats.pendingOrders).toBe(3); // pending, accepted, in_progress
      expect(stats.completedOrders).toBe(2);
      expect(stats.totalEarnings).toBe(22000); // $50 + $70 + $100
      expect(stats.pendingEarnings).toBe(12000); // $50 + $70 (pending + confirmed)
      expect(stats.paidEarnings).toBe(10000); // $100
    });

    it('should return zero stats for publisher with no activity', async () => {
      // Arrange
      const publisherId = testUtils.generateTestId();

      // Act
      const stats = await PublisherOrderService.getPublisherOrderStats(publisherId);

      // Assert
      expect(stats.totalOrders).toBe(0);
      expect(stats.pendingOrders).toBe(0);
      expect(stats.completedOrders).toBe(0);
      expect(stats.totalEarnings).toBe(0);
      expect(stats.pendingEarnings).toBe(0);
      expect(stats.paidEarnings).toBe(0);
    });
  });
});