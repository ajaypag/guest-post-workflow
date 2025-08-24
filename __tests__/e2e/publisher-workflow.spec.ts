/**
 * End-to-End Tests for Complete Publisher Workflow
 * Tests the full publisher workflow from assignment to completion
 */

import { test, expect, Page } from '@playwright/test';
import { PublisherTestDataFactory, TestDataPersistence } from '../factories/publisherTestDataFactory';
import { testUtils } from '../setup';

// Test data storage
let testData: {
  publisher: any;
  website: any;
  offering: any;
  relationship: any;
  client: any;
  order: any;
  lineItem: any;
  adminUser: any;
};

// Helper functions for authentication
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('[data-testid="email"]', 'admin@test.com');
  await page.fill('[data-testid="password"]', 'admin123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/admin');
}

async function loginAsPublisher(page: Page, email: string, password: string = 'testpublisher123') {
  await page.goto('/publisher/login');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/publisher');
}

async function createTestScenario() {
  const scenario = await PublisherTestDataFactory.createOrderWithPublisherScenario();
  
  // Set specific values for testing
  scenario.lineItem.publisherPrice = 10000; // $100
  scenario.lineItem.platformFee = 3000; // $30
  scenario.lineItem.publisherStatus = undefined; // Not assigned yet
  scenario.lineItem.status = 'pending';
  
  // Create admin user
  const adminUser = {
    id: testUtils.generateTestId(),
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'admin'
  };
  
  // Persist all test data
  await TestDataPersistence.persistCompleteScenario(scenario);
  
  // Create bulk analysis domain for assignment
  await testUtils.query(`
    INSERT INTO bulk_analysis_domains (id, domain, website_id, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
  `, [testUtils.generateTestId(), scenario.website.domain, scenario.website.id]);
  
  // Create admin user in database
  await testUtils.query(`
    INSERT INTO users (id, email, name, role, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `, [adminUser.id, adminUser.email, adminUser.name, adminUser.role]);
  
  return { ...scenario, adminUser };
}

test.describe('Complete Publisher Workflow E2E', () => {
  test.beforeEach(async () => {
    // Create fresh test data for each test
    testData = await createTestScenario();
  });
  
  test('Full order assignment to completion flow', async ({ page }) => {
    // Step 1: Admin assigns order to publisher
    console.log('Step 1: Admin assigns order to publisher');
    
    await loginAsAdmin(page);
    
    // Navigate to orders page
    await page.goto('/admin/orders');
    await expect(page.locator('h1')).toContainText('Orders');
    
    // Find the test order
    const orderRow = page.locator(`[data-testid="order-row-${testData.order.id}"]`);
    await expect(orderRow).toBeVisible();
    
    // Click assign button for the line item
    await page.click(`[data-testid="assign-publisher-${testData.lineItem.id}"]`);
    
    // Select domain for assignment
    await page.selectOption('[data-testid="domain-select"]', testData.website.domain);
    
    // Confirm assignment
    await page.click('[data-testid="confirm-assignment"]');
    
    // Wait for assignment success message
    await expect(page.locator('[data-testid="assignment-success"]')).toBeVisible();
    
    // Verify assignment in database
    const assignedItem = await testUtils.query(`
      SELECT assigned_domain, publisher_id, publisher_status, status
      FROM order_line_items WHERE id = $1
    `, [testData.lineItem.id]);
    
    expect(assignedItem.rows[0].assigned_domain).toBe(testData.website.domain);
    expect(assignedItem.rows[0].publisher_id).toBe(testData.publisher.id);
    expect(assignedItem.rows[0].publisher_status).toBe('pending');
    expect(assignedItem.rows[0].status).toBe('assigned');
    
    // Step 2: Publisher logs in and views assignment
    console.log('Step 2: Publisher logs in and views assignment');
    
    await loginAsPublisher(page, testData.publisher.email);
    
    // Navigate to orders page
    await page.goto('/publisher/orders');
    await expect(page.locator('h1')).toContainText('Orders');
    
    // Verify order appears in publisher dashboard
    const publisherOrderRow = page.locator(`[data-testid="order-${testData.lineItem.id}"]`);
    await expect(publisherOrderRow).toBeVisible();
    
    // Check order details
    await expect(publisherOrderRow.locator('[data-testid="anchor-text"]')).toContainText(testData.lineItem.anchorText);
    await expect(publisherOrderRow.locator('[data-testid="domain"]')).toContainText(testData.website.domain);
    await expect(publisherOrderRow.locator('[data-testid="status"]')).toContainText('pending');
    
    // Step 3: Publisher accepts the order
    console.log('Step 3: Publisher accepts the order');
    
    await page.click(`[data-testid="view-order-${testData.lineItem.id}"]`);
    
    // Verify order details page
    await expect(page.locator('[data-testid="order-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="target-url"]')).toContainText(testData.lineItem.targetPageUrl);
    await expect(page.locator('[data-testid="publisher-price"]')).toContainText('$100.00');
    await expect(page.locator('[data-testid="platform-fee"]')).toContainText('$30.00');
    await expect(page.locator('[data-testid="net-earnings"]')).toContainText('$70.00');
    
    // Accept the order
    await page.click('[data-testid="accept-order"]');
    
    // Wait for acceptance confirmation
    await expect(page.locator('[data-testid="order-accepted"]')).toBeVisible();
    
    // Verify status in database
    const acceptedItem = await testUtils.query(`
      SELECT publisher_status, publisher_accepted_at FROM order_line_items WHERE id = $1
    `, [testData.lineItem.id]);
    
    expect(acceptedItem.rows[0].publisher_status).toBe('accepted');
    expect(acceptedItem.rows[0].publisher_accepted_at).toBeDefined();
    
    // Step 4: Publisher starts work
    console.log('Step 4: Publisher starts work');
    
    await page.click('[data-testid="start-work"]');
    
    // Wait for status update
    await expect(page.locator('[data-testid="status-in-progress"]')).toBeVisible();
    
    // Verify database update
    const inProgressItem = await testUtils.query(`
      SELECT publisher_status FROM order_line_items WHERE id = $1
    `, [testData.lineItem.id]);
    
    expect(inProgressItem.rows[0].publisher_status).toBe('in_progress');
    
    // Step 5: Publisher submits completed work
    console.log('Step 5: Publisher submits completed work');
    
    // Fill in completion details
    await page.fill('[data-testid="published-url"]', 'https://example.com/published-content');
    await page.fill('[data-testid="completion-notes"]', 'Content has been published successfully with the required anchor text and link.');
    
    // Submit work
    await page.click('[data-testid="submit-work"]');
    
    // Wait for submission confirmation
    await expect(page.locator('[data-testid="work-submitted"]')).toBeVisible();
    await expect(page.locator('[data-testid="submission-message"]')).toContainText('Your work has been submitted for review');
    
    // Verify database update
    const submittedItem = await testUtils.query(`
      SELECT publisher_status, published_url, completion_notes, publisher_submitted_at 
      FROM order_line_items WHERE id = $1
    `, [testData.lineItem.id]);
    
    const submitted = submittedItem.rows[0];
    expect(submitted.publisher_status).toBe('submitted');
    expect(submitted.published_url).toBe('https://example.com/published-content');
    expect(submitted.completion_notes).toContain('Content has been published successfully');
    expect(submitted.publisher_submitted_at).toBeDefined();
    
    // Step 6: Admin reviews and approves submission
    console.log('Step 6: Admin reviews and approves submission');
    
    await loginAsAdmin(page);
    
    // Navigate to orders for review
    await page.goto('/admin/orders');
    
    // Find submitted work
    const submittedOrderRow = page.locator(`[data-testid="order-row-${testData.order.id}"]`);
    await expect(submittedOrderRow.locator('[data-testid="status"]')).toContainText('submitted');
    
    // Review submission
    await page.click(`[data-testid="review-submission-${testData.lineItem.id}"]`);
    
    // Verify submission details
    await expect(page.locator('[data-testid="published-url-display"]')).toContainText('https://example.com/published-content');
    await expect(page.locator('[data-testid="completion-notes-display"]')).toContainText('Content has been published successfully');
    
    // Approve the work
    await page.click('[data-testid="approve-work"]');
    
    // Wait for approval confirmation
    await expect(page.locator('[data-testid="work-approved"]')).toBeVisible();
    
    // Step 7: Verify earnings are created
    console.log('Step 7: Verify earnings are created');
    
    // Check database for earnings record
    await testUtils.waitFor(async () => {
      const earnings = await testUtils.query(`
        SELECT * FROM publisher_earnings WHERE order_line_item_id = $1
      `, [testData.lineItem.id]);
      return earnings.rows.length > 0;
    }, 10000);
    
    const earnings = await testUtils.query(`
      SELECT publisher_id, order_line_item_id, amount, gross_amount, platform_fee_amount, 
             net_amount, status, earning_type
      FROM publisher_earnings WHERE order_line_item_id = $1
    `, [testData.lineItem.id]);
    
    expect(earnings.rows).toHaveLength(1);
    const earning = earnings.rows[0];
    expect(earning.publisher_id).toBe(testData.publisher.id);
    expect(earning.amount).toBe(10000); // $100
    expect(earning.gross_amount).toBe(10000);
    expect(earning.platform_fee_amount).toBe(3000); // $30
    expect(earning.net_amount).toBe(7000); // $70
    expect(earning.status).toBe('pending');
    expect(earning.earning_type).toBe('order_completion');
    
    // Verify line item status
    const completedItem = await testUtils.query(`
      SELECT publisher_status FROM order_line_items WHERE id = $1
    `, [testData.lineItem.id]);
    
    expect(completedItem.rows[0].publisher_status).toBe('completed');
    
    // Step 8: Publisher views earnings
    console.log('Step 8: Publisher views earnings');
    
    await loginAsPublisher(page, testData.publisher.email);
    
    // Navigate to earnings page
    await page.goto('/publisher/earnings');
    await expect(page.locator('h1')).toContainText('Earnings');
    
    // Verify earnings display
    await expect(page.locator('[data-testid="total-earnings"]')).toContainText('$70.00');
    await expect(page.locator('[data-testid="pending-earnings"]')).toContainText('$70.00');
    await expect(page.locator('[data-testid="paid-earnings"]')).toContainText('$0.00');
    
    // Verify earnings item in list
    const earningsItem = page.locator('[data-testid="earnings-item"]').first();
    await expect(earningsItem).toBeVisible();
    await expect(earningsItem.locator('[data-testid="amount"]')).toContainText('$70.00');
    await expect(earningsItem.locator('[data-testid="status"]')).toContainText('pending');
    await expect(earningsItem.locator('[data-testid="order-ref"]')).toContainText(testData.lineItem.anchorText);
  });
  
  test('Publisher rejection flow', async ({ page }) => {
    // Create assignment first
    await testUtils.query(`
      UPDATE order_line_items 
      SET assigned_domain = $1, publisher_id = $2, publisher_status = 'pending', status = 'assigned'
      WHERE id = $3
    `, [testData.website.domain, testData.publisher.id, testData.lineItem.id]);
    
    // Publisher logs in and rejects order
    await loginAsPublisher(page, testData.publisher.email);
    
    await page.goto('/publisher/orders');
    await page.click(`[data-testid="view-order-${testData.lineItem.id}"]`);
    
    // Reject the order
    await page.click('[data-testid="reject-order"]');
    
    // Fill rejection reason
    await page.fill('[data-testid="rejection-reason"]', 'Content topic not suitable for our audience');
    await page.click('[data-testid="confirm-rejection"]');
    
    // Verify rejection
    await expect(page.locator('[data-testid="order-rejected"]')).toBeVisible();
    
    // Verify database update
    const rejectedItem = await testUtils.query(`
      SELECT publisher_status, rejection_reason FROM order_line_items WHERE id = $1
    `, [testData.lineItem.id]);
    
    expect(rejectedItem.rows[0].publisher_status).toBe('rejected');
    expect(rejectedItem.rows[0].rejection_reason).toContain('not suitable for our audience');
    
    // Verify admin can see rejection
    await loginAsAdmin(page);
    await page.goto('/admin/orders');
    
    const rejectedOrderRow = page.locator(`[data-testid="order-row-${testData.order.id}"]`);
    await expect(rejectedOrderRow.locator('[data-testid="status"]')).toContainText('rejected');
  });
  
  test('Payment profile setup and invoice submission flow', async ({ page }) => {
    // Publisher sets up payment profile
    await loginAsPublisher(page, testData.publisher.email);
    
    await page.goto('/publisher/payment-profile');
    await expect(page.locator('h1')).toContainText('Payment Profile');
    
    // Fill payment profile form
    await page.fill('[data-testid="bank-account"]', '123456789');
    await page.fill('[data-testid="routing-number"]', '987654321');
    await page.fill('[data-testid="account-holder"]', 'Test Publisher LLC');
    await page.selectOption('[data-testid="bank-country"]', 'US');
    await page.fill('[data-testid="tax-id"]', '12-3456789');
    
    await page.click('[data-testid="save-payment-profile"]');
    
    // Verify profile saved
    await expect(page.locator('[data-testid="profile-saved"]')).toBeVisible();
    
    // Verify database record
    const paymentProfile = await testUtils.query(`
      SELECT * FROM publisher_payment_profiles WHERE publisher_id = $1
    `, [testData.publisher.id]);
    
    expect(paymentProfile.rows).toHaveLength(1);
    const profile = paymentProfile.rows[0];
    expect(profile.bank_account_number).toBe('123456789');
    expect(profile.routing_number).toBe('987654321');
    expect(profile.account_holder_name).toBe('Test Publisher LLC');
    
    // Create some earnings for invoice submission
    await testUtils.query(`
      INSERT INTO publisher_earnings (id, publisher_id, net_amount, status, created_at, updated_at)
      VALUES ($1, $2, 15000, 'confirmed', NOW(), NOW())
    `, [testUtils.generateTestId(), testData.publisher.id]);
    
    // Submit invoice
    await page.goto('/publisher/invoices');
    await expect(page.locator('h1')).toContainText('Invoices');
    
    await page.click('[data-testid="create-invoice"]');
    
    // Fill invoice form
    await page.fill('[data-testid="invoice-amount"]', '150.00');
    await page.fill('[data-testid="invoice-description"]', 'Content creation services for January 2024');
    await page.selectOption('[data-testid="payment-method"]', 'bank_transfer');
    
    await page.click('[data-testid="submit-invoice"]');
    
    // Verify invoice submitted
    await expect(page.locator('[data-testid="invoice-submitted"]')).toBeVisible();
    
    // Verify database record
    const invoice = await testUtils.query(`
      SELECT * FROM publisher_invoices WHERE publisher_id = $1
    `, [testData.publisher.id]);
    
    expect(invoice.rows).toHaveLength(1);
    const invoiceRecord = invoice.rows[0];
    expect(invoiceRecord.amount).toBe(15000); // $150 in cents
    expect(invoiceRecord.description).toContain('Content creation services');
    expect(invoiceRecord.payment_method).toBe('bank_transfer');
    expect(invoiceRecord.status).toBe('submitted');
  });
  
  test('Email notification system integration', async ({ page }) => {
    // Mock email service for testing
    const emailSpy = jest.spyOn(require('resend'), 'Resend').mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ data: { id: 'test-email-id' } })
      }
    }));
    
    // Simulate order assignment which triggers email
    await loginAsAdmin(page);
    await page.goto('/admin/orders');
    
    // Assign order to publisher
    await page.click(`[data-testid="assign-publisher-${testData.lineItem.id}"]`);
    await page.selectOption('[data-testid="domain-select"]', testData.website.domain);
    await page.click('[data-testid="confirm-assignment"]');
    
    // Wait for assignment and email notification
    await expect(page.locator('[data-testid="assignment-success"]')).toBeVisible();
    
    // Wait for notification record in database
    await testUtils.waitFor(async () => {
      const notifications = await testUtils.query(`
        SELECT * FROM publisher_order_notifications 
        WHERE publisher_id = $1 AND order_line_item_id = $2
      `, [testData.publisher.id, testData.lineItem.id]);
      return notifications.rows.length > 0;
    }, 10000);
    
    // Verify notification record
    const notifications = await testUtils.query(`
      SELECT notification_type, status, subject, channel, sent_at
      FROM publisher_order_notifications 
      WHERE publisher_id = $1 AND order_line_item_id = $2
    `, [testData.publisher.id, testData.lineItem.id]);
    
    expect(notifications.rows).toHaveLength(1);
    const notification = notifications.rows[0];
    expect(notification.notification_type).toBe('assignment');
    expect(notification.status).toBe('sent');
    expect(notification.subject).toContain('New Order Assignment');
    expect(notification.channel).toBe('email');
    expect(notification.sent_at).toBeDefined();
    
    // Restore email mock
    emailSpy.mockRestore();
  });
  
  test('Error handling and edge cases', async ({ page }) => {
    // Test concurrent status updates
    await testUtils.query(`
      UPDATE order_line_items 
      SET publisher_id = $1, publisher_status = 'accepted'
      WHERE id = $2
    `, [testData.publisher.id, testData.lineItem.id]);
    
    await loginAsPublisher(page, testData.publisher.email);
    await page.goto('/publisher/orders');
    await page.click(`[data-testid="view-order-${testData.lineItem.id}"]`);
    
    // Try to submit work without starting it first
    await page.fill('[data-testid="published-url"]', 'https://example.com/published');
    await page.click('[data-testid="submit-work"]');
    
    // Should show error about invalid status transition
    await expect(page.locator('[data-testid="status-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-error"]')).toContainText('must start work first');
    
    // Test invalid URL format
    await page.click('[data-testid="start-work"]');
    await page.fill('[data-testid="published-url"]', 'not-a-valid-url');
    await page.click('[data-testid="submit-work"]');
    
    // Should show URL validation error
    await expect(page.locator('[data-testid="url-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="url-error"]')).toContainText('valid URL');
    
    // Test access to non-owned order
    const otherPublisher = PublisherTestDataFactory.createPublisher();
    await TestDataPersistence.insertPublisher(otherPublisher);
    
    await loginAsPublisher(page, otherPublisher.email);
    
    // Try to access another publisher's order directly
    await page.goto(`/publisher/orders/${testData.lineItem.id}`);
    
    // Should be redirected or show access denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });
});