import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { InternalLayoutPage } from './page-objects/InternalLayoutPage';
import { PublisherManagementPage } from './page-objects/PublisherManagementPage';
import { PublisherDetailPage } from './page-objects/PublisherDetailPage';
import { DatabaseHelpers } from './helpers/databaseHelpers';
import { TestDataFactory, CREDENTIALS, TEST_SCENARIOS } from './helpers/testData';

/**
 * SPECIFIC TEST SCENARIOS
 * 
 * These tests cover specific workflow scenarios that internal users need to perform
 * when managing the publisher system. They test realistic user journeys and
 * complex multi-step workflows.
 */

test.describe('Specific Publisher Management Scenarios', () => {
  let loginPage: LoginPage;
  let internalLayout: InternalLayoutPage;
  let publisherManagement: PublisherManagementPage;
  let publisherDetail: PublisherDetailPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    internalLayout = new InternalLayoutPage(page);
    publisherManagement = new PublisherManagementPage(page);
    publisherDetail = new PublisherDetailPage(page);

    // Clean up before each test
    await DatabaseHelpers.cleanupTestData();
  });

  test.afterEach(async () => {
    // Clean up after each test
    await DatabaseHelpers.cleanupTestData();
  });

  test.describe('Publisher Onboarding Workflow', () => {
    test('Complete publisher onboarding from creation to first offering', async ({ page }) => {
      const newPublisher = TestDataFactory.createPublisher({
        companyName: 'New Publisher Onboarding Test',
        email: `onboarding-${Date.now()}@test.com`,
      });

      const website = TestDataFactory.createWebsite({
        domain: `onboarding-test-${Date.now()}.com`,
      });

      // Create website first (simulating existing website in system)
      await DatabaseHelpers.createTestWebsite(website);

      await loginPage.loginAsInternalUser();

      // Step 1: Create new publisher
      await publisherManagement.goto();
      await publisherManagement.clickAddPublisher();

      // Fill publisher details
      await page.fill('input[name="email"]', newPublisher.email);
      await page.fill('input[name="companyName"]', newPublisher.companyName);
      await page.fill('input[name="contactName"]', newPublisher.contactName);
      await page.selectOption('select[name="tier"]', 'standard');
      await page.click('button[type="submit"]');

      // Should redirect to publisher detail page
      const publisherIdMatch = page.url().match(/\/internal\/publishers\/([a-f0-9-]+)$/);
      expect(publisherIdMatch).toBeTruthy();
      const publisherId = publisherIdMatch![1];

      // Step 2: Verify publisher appears as pending
      await publisherDetail.expectStatus('pending');
      await publisherDetail.expectTier('standard');

      // Step 3: Connect website to publisher
      await publisherDetail.addWebsite(website.id);
      
      // Should be able to select the website
      await page.click(`[data-website-id="${website.id}"]`);
      await page.click('button:has-text("Connect Website")');
      
      // Should see success message
      await expect(page.locator('text=Website connected successfully')).toBeVisible();

      // Step 4: Create first offering
      await publisherDetail.addOffering();
      
      // Fill offering details
      await page.selectOption('select[name="offeringType"]', 'guest_post');
      await page.fill('input[name="basePrice"]', '500');
      await page.fill('input[name="turnaroundDays"]', '7');
      await page.fill('input[name="minWordCount"]', '1000');
      await page.fill('input[name="maxWordCount"]', '2000');
      await page.click('button[type="submit"]');

      // Should see success message
      await expect(page.locator('text=Offering created successfully')).toBeVisible();

      // Step 5: Verify complete setup
      await publisherDetail.goto(publisherId);
      await publisherDetail.expectWebsiteCount(1);
      await publisherDetail.expectOfferingCount(1);

      // Step 6: Verify publisher (final step)
      await publisherDetail.clickVerify();
      await publisherDetail.expectStatus('verified');

      // Verify onboarding is complete
      await expect(page.locator('text=Onboarding Complete')).toBeVisible();
    });

    test('Handle publisher onboarding with duplicate website', async ({ page }) => {
      const publisher1 = TestDataFactory.createPublisher({
        email: `publisher1-${Date.now()}@test.com`,
      });

      const publisher2 = TestDataFactory.createPublisher({
        email: `publisher2-${Date.now()}@test.com`,
      });

      const website = TestDataFactory.createWebsite({
        domain: `shared-website-${Date.now()}.com`,
      });

      // Create initial publisher and website relationship
      await DatabaseHelpers.createTestPublisher(publisher1);
      await DatabaseHelpers.createTestWebsite(website);
      
      const offering1 = TestDataFactory.createOffering(publisher1.id, website.id);
      await DatabaseHelpers.createTestOffering(offering1);
      
      const relationship1 = TestDataFactory.createOfferingRelationship(
        publisher1.id,
        offering1.id,
        website.id,
        { relationshipType: 'owner', isPrimary: true }
      );
      await DatabaseHelpers.createTestRelationship(relationship1);

      // Create second publisher
      await DatabaseHelpers.createTestPublisher(publisher2);

      await loginPage.loginAsInternalUser();

      // Try to connect same website to second publisher
      await publisherDetail.goto(publisher2.id);
      await publisherDetail.addWebsite(website.id);

      // Should see warning about existing relationship
      await expect(page.locator('text=Website already connected to another publisher')).toBeVisible();

      // Should see option to create secondary relationship
      await expect(page.locator('button:has-text("Create Secondary Relationship")')).toBeVisible();

      // Create secondary relationship
      await page.click('button:has-text("Create Secondary Relationship")');
      await page.selectOption('select[name="relationshipType"]', 'contact');
      await page.click('button:has-text("Create Relationship")');

      // Should see success message
      await expect(page.locator('text=Secondary relationship created')).toBeVisible();

      // Should show website with secondary status
      await expect(page.locator('[data-testid="website-relationship-secondary"]')).toBeVisible();
    });
  });

  test.describe('Publisher Verification Workflow', () => {
    test('Bulk verify multiple publishers', async ({ page }) => {
      // Create multiple pending publishers
      const publishers = await Promise.all([
        TestDataFactory.createPublisher({ email: `bulk1-${Date.now()}@test.com` }),
        TestDataFactory.createPublisher({ email: `bulk2-${Date.now()}@test.com` }),
        TestDataFactory.createPublisher({ email: `bulk3-${Date.now()}@test.com` }),
      ]);

      for (const publisher of publishers) {
        await DatabaseHelpers.createTestPublisher(publisher);
      }

      await loginPage.loginAsInternalUser();
      await publisherManagement.goto();

      // Select multiple publishers
      for (const publisher of publishers) {
        const row = await publisherManagement.getPublisherRowByEmail(publisher.email);
        await row.locator('input[type="checkbox"]').check();
      }

      // Click bulk verify button
      await page.click('button:has-text("Bulk Actions")');
      await page.click('button:has-text("Verify Selected")');

      // Should see confirmation dialog
      await expect(page.locator('text=Verify 3 publishers?')).toBeVisible();
      await page.click('button:has-text("Confirm")');

      // Should see success message
      await expect(page.locator('text=3 publishers verified successfully')).toBeVisible();

      // Verify status updated in table
      for (const publisher of publishers) {
        const row = await publisherManagement.getPublisherRowByEmail(publisher.email);
        await expect(row.locator('[data-testid="status-badge"]:has-text("Verified")')).toBeVisible();
      }
    });

    test('Verify publisher with incomplete setup', async ({ page }) => {
      const publisher = TestDataFactory.createPublisher({
        email: `incomplete-${Date.now()}@test.com`,
      });

      await DatabaseHelpers.createTestPublisher(publisher);

      await loginPage.loginAsInternalUser();
      await publisherDetail.goto(publisher.id);

      // Try to verify publisher without websites/offerings
      await publisherDetail.clickVerify();

      // Should see warning about incomplete setup
      await expect(page.locator('text=Publisher has no websites or offerings')).toBeVisible();

      // Should see options to proceed or cancel
      await expect(page.locator('button:has-text("Verify Anyway")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();

      // Cancel verification
      await page.click('button:has-text("Cancel")');
      await publisherDetail.expectStatus('pending');

      // Add website and try again
      const website = TestDataFactory.createWebsite();
      await DatabaseHelpers.createTestWebsite(website);
      
      await publisherDetail.addWebsite(website.id);
      await page.click(`[data-website-id="${website.id}"]`);
      await page.click('button:has-text("Connect Website")');

      // Now verification should work
      await publisherDetail.clickVerify();
      await publisherDetail.expectStatus('verified');
    });
  });

  test.describe('Publisher Performance Monitoring', () => {
    test('Monitor publisher performance and flag issues', async ({ page }) => {
      const publisher = TestDataFactory.createPublisher({
        email: `performance-${Date.now()}@test.com`,
        emailVerified: true,
        status: 'active',
      });

      const website = TestDataFactory.createWebsite();
      await DatabaseHelpers.createTestPublisher(publisher);
      await DatabaseHelpers.createTestWebsite(website);

      // Create offering and relationship
      const offering = TestDataFactory.createOffering(publisher.id, website.id);
      await DatabaseHelpers.createTestOffering(offering);

      const relationship = TestDataFactory.createOfferingRelationship(
        publisher.id,
        offering.id,
        website.id
      );
      await DatabaseHelpers.createTestRelationship(relationship);

      await loginPage.loginAsInternalUser();
      await publisherDetail.goto(publisher.id);

      // Should see performance metrics section
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();

      // Should show key performance indicators
      await expect(page.locator('text=Response Time')).toBeVisible();
      await expect(page.locator('text=Delivery Rate')).toBeVisible();
      await expect(page.locator('text=Quality Score')).toBeVisible();

      // Simulate poor performance (this would be real data in production)
      await page.click('button:has-text("Simulate Poor Performance")');

      // Should see warning indicators
      await expect(page.locator('[data-testid="performance-warning"]')).toBeVisible();
      await expect(page.locator('text=Performance issues detected')).toBeVisible();

      // Should see action buttons
      await expect(page.locator('button:has-text("Contact Publisher")')).toBeVisible();
      await expect(page.locator('button:has-text("Suspend Account")')).toBeVisible();
      await expect(page.locator('button:has-text("Add Note")')).toBeVisible();
    });

    test('Handle publisher suspension workflow', async ({ page }) => {
      const publisher = TestDataFactory.createPublisher({
        email: `suspension-${Date.now()}@test.com`,
        emailVerified: true,
        status: 'active',
      });

      await DatabaseHelpers.createTestPublisher(publisher);

      await loginPage.loginAsInternalUser();
      await publisherDetail.goto(publisher.id);

      // Click suspend button
      await publisherDetail.suspendButton.click();

      // Should see suspension confirmation dialog
      await expect(page.locator('text=Suspend this publisher?')).toBeVisible();
      await expect(page.locator('textarea[name="suspensionReason"]')).toBeVisible();

      // Fill suspension reason
      await page.fill('textarea[name="suspensionReason"]', 'Poor quality content delivery');
      await page.click('button:has-text("Confirm Suspension")');

      // Should see success message
      await expect(page.locator('text=Publisher suspended successfully')).toBeVisible();

      // Status should update
      await publisherDetail.expectStatus('suspended');

      // Should see suspension notice
      await expect(page.locator('[data-testid="suspension-notice"]')).toBeVisible();
      await expect(page.locator('text=Poor quality content delivery')).toBeVisible();

      // Should see reactivate button
      await expect(page.locator('button:has-text("Reactivate")')).toBeVisible();
    });
  });

  test.describe('Website-Publisher Relationship Management', () => {
    test('Transfer website ownership between publishers', async ({ page }) => {
      const currentOwner = TestDataFactory.createPublisher({
        email: `current-owner-${Date.now()}@test.com`,
      });

      const newOwner = TestDataFactory.createPublisher({
        email: `new-owner-${Date.now()}@test.com`,
      });

      const website = TestDataFactory.createWebsite();

      // Set up initial relationships
      await DatabaseHelpers.createTestPublisher(currentOwner);
      await DatabaseHelpers.createTestPublisher(newOwner);
      await DatabaseHelpers.createTestWebsite(website);

      const offering = TestDataFactory.createOffering(currentOwner.id, website.id);
      await DatabaseHelpers.createTestOffering(offering);

      const relationship = TestDataFactory.createOfferingRelationship(
        currentOwner.id,
        offering.id,
        website.id,
        { relationshipType: 'owner', isPrimary: true }
      );
      await DatabaseHelpers.createTestRelationship(relationship);

      await loginPage.loginAsInternalUser();

      // Navigate to website detail page
      await page.goto(`/internal/websites/${website.id}`);

      // Should see current owner
      await expect(page.locator('text=' + currentOwner.companyName)).toBeVisible();

      // Click transfer ownership
      await page.click('button:has-text("Transfer Ownership")');

      // Should see transfer form
      await expect(page.locator('text=Transfer ownership to')).toBeVisible();
      await expect(page.locator('select[name="newOwnerId"]')).toBeVisible();

      // Select new owner
      await page.selectOption('select[name="newOwnerId"]', newOwner.id);
      await page.fill('textarea[name="transferReason"]', 'Website sold to new publisher');
      await page.click('button:has-text("Transfer Ownership")');

      // Should see confirmation dialog
      await expect(page.locator('text=Confirm ownership transfer?')).toBeVisible();
      await page.click('button:has-text("Confirm Transfer")');

      // Should see success message
      await expect(page.locator('text=Ownership transferred successfully')).toBeVisible();

      // Should now show new owner
      await expect(page.locator('text=' + newOwner.companyName)).toBeVisible();

      // Previous owner should be listed as former owner
      await expect(page.locator('text=Former Owner: ' + currentOwner.companyName)).toBeVisible();
    });

    test('Resolve conflicting publisher claims on same website', async ({ page }) => {
      const publisher1 = TestDataFactory.createPublisher({
        email: `claimant1-${Date.now()}@test.com`,
      });

      const publisher2 = TestDataFactory.createPublisher({
        email: `claimant2-${Date.now()}@test.com`,
      });

      const website = TestDataFactory.createWebsite({
        domain: `disputed-site-${Date.now()}.com`,
      });

      // Both publishers claim the same website
      await DatabaseHelpers.createTestPublisher(publisher1);
      await DatabaseHelpers.createTestPublisher(publisher2);
      await DatabaseHelpers.createTestWebsite(website);

      // Create conflicting claims
      const offering1 = TestDataFactory.createOffering(publisher1.id, website.id);
      const offering2 = TestDataFactory.createOffering(publisher2.id, website.id);
      await DatabaseHelpers.createTestOffering(offering1);
      await DatabaseHelpers.createTestOffering(offering2);

      const relationship1 = TestDataFactory.createOfferingRelationship(
        publisher1.id,
        offering1.id,
        website.id,
        { relationshipType: 'owner', verificationStatus: 'claimed' }
      );

      const relationship2 = TestDataFactory.createOfferingRelationship(
        publisher2.id,
        offering2.id,
        website.id,
        { relationshipType: 'owner', verificationStatus: 'claimed' }
      );

      await DatabaseHelpers.createTestRelationship(relationship1);
      await DatabaseHelpers.createTestRelationship(relationship2);

      await loginPage.loginAsInternalUser();

      // Navigate to website detail page
      await page.goto(`/internal/websites/${website.id}`);

      // Should see conflict warning
      await expect(page.locator('[data-testid="ownership-conflict"]')).toBeVisible();
      await expect(page.locator('text=Multiple ownership claims detected')).toBeVisible();

      // Should see both claimants
      await expect(page.locator('text=' + publisher1.companyName)).toBeVisible();
      await expect(page.locator('text=' + publisher2.companyName)).toBeVisible();

      // Click resolve conflict
      await page.click('button:has-text("Resolve Conflict")');

      // Should see resolution options
      await expect(page.locator('text=Choose the verified owner')).toBeVisible();
      await expect(page.locator(`input[value="${publisher1.id}"]`)).toBeVisible();
      await expect(page.locator(`input[value="${publisher2.id}"]`)).toBeVisible();

      // Select publisher 1 as verified owner
      await page.check(`input[value="${publisher1.id}"]`);
      await page.fill('textarea[name="resolutionNotes"]', 'Verified through domain ownership check');
      await page.click('button:has-text("Resolve")');

      // Should see success message
      await expect(page.locator('text=Ownership conflict resolved')).toBeVisible();

      // Publisher 1 should now be verified owner
      await expect(page.locator(`[data-publisher-id="${publisher1.id}"][data-status="verified"]`)).toBeVisible();

      // Publisher 2 should be marked as rejected claim
      await expect(page.locator(`[data-publisher-id="${publisher2.id}"][data-status="rejected"]`)).toBeVisible();
    });
  });

  test.describe('Reporting and Analytics', () => {
    test('Generate comprehensive publisher performance report', async ({ page }) => {
      // Create multiple publishers with different performance levels
      const publishers = [
        TestDataFactory.createPublisher({
          email: `high-performer-${Date.now()}@test.com`,
          tier: 'premium',
          emailVerified: true,
        }),
        TestDataFactory.createPublisher({
          email: `medium-performer-${Date.now()}@test.com`,
          tier: 'standard',
          emailVerified: true,
        }),
        TestDataFactory.createPublisher({
          email: `low-performer-${Date.now()}@test.com`,
          tier: 'basic',
          emailVerified: false,
        }),
      ];

      for (const publisher of publishers) {
        await DatabaseHelpers.createTestPublisher(publisher);
      }

      await loginPage.loginAsInternalUser();

      // Navigate to analytics page
      await page.goto('/internal/analytics');

      // Should see analytics dashboard
      await expect(page.locator('h1:has-text("Publisher Analytics")')).toBeVisible();

      // Should see key metrics
      await expect(page.locator('[data-testid="total-publishers"]')).toBeVisible();
      await expect(page.locator('[data-testid="verification-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="tier-distribution"]')).toBeVisible();

      // Generate detailed report
      await page.click('button:has-text("Generate Report")');

      // Should see report options
      await expect(page.locator('text=Report Type')).toBeVisible();
      await page.selectOption('select[name="reportType"]', 'performance');
      await page.selectOption('select[name="dateRange"]', 'last30days');
      await page.check('input[name="includeWebsites"]');
      await page.check('input[name="includeOfferings"]');

      // Generate report
      await page.click('button:has-text("Generate")');

      // Should see download link
      const downloadPromise = page.waitForEvent('download');
      await page.click('a:has-text("Download Report")');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/publisher.*report.*\.(pdf|xlsx)$/);
    });

    test('Monitor real-time publisher activity dashboard', async ({ page }) => {
      const publisher = TestDataFactory.createPublisher({
        email: `realtime-${Date.now()}@test.com`,
        emailVerified: true,
        status: 'active',
      });

      await DatabaseHelpers.createTestPublisher(publisher);

      await loginPage.loginAsInternalUser();

      // Navigate to real-time dashboard
      await page.goto('/internal/dashboard/realtime');

      // Should see real-time activity feed
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      await expect(page.locator('text=Live Activity')).toBeVisible();

      // Should see activity metrics
      await expect(page.locator('[data-testid="active-publishers"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-signups"]')).toBeVisible();
      await expect(page.locator('[data-testid="verification-queue"]')).toBeVisible();

      // Should update automatically (check for data refresh)
      const initialTimestamp = await page.locator('[data-testid="last-updated"]').textContent();
      
      // Wait for auto-refresh
      await page.waitForTimeout(5000);
      
      const updatedTimestamp = await page.locator('[data-testid="last-updated"]').textContent();
      expect(updatedTimestamp).not.toBe(initialTimestamp);

      // Should be able to filter activity
      await page.selectOption('select[name="activityFilter"]', 'verifications');
      await expect(page.locator('[data-activity-type="verification"]')).toBeVisible();
    });
  });
});