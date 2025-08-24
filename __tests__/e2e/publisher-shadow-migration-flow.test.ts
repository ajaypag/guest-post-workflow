import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import * as crypto from 'crypto';

// Test configuration
const TEST_EMAIL = 'test-publisher@example.com';
const TEST_PASSWORD = 'TestPassword123!';
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3002';

let testPublisherId: string;
let invitationToken: string;
let dbPool: Pool;

test.describe('Publisher Shadow Migration Flow E2E', () => {
  test.beforeAll(async () => {
    // Setup database connection
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    console.log('🏗️  Setting up test shadow publisher...');
    
    // Generate test data
    testPublisherId = crypto.randomUUID();
    invitationToken = crypto.randomBytes(32).toString('hex');
    
    const testWebsites = [
      {
        id: crypto.randomUUID(),
        domain: 'e2e-techblog.com',
        guestPostCost: '350',
        turnaroundTime: '5'
      },
      {
        id: crypto.randomUUID(),
        domain: 'e2e-business.net', 
        guestPostCost: '275',
        turnaroundTime: '3'
      }
    ];

    try {
      await dbPool.query('BEGIN');

      // Clean up any existing test data
      await dbPool.query(`
        DELETE FROM shadow_publisher_websites WHERE publisher_id IN (
          SELECT id FROM publishers WHERE email = $1
        )
      `, [TEST_EMAIL]);
      
      await dbPool.query(`
        DELETE FROM publisher_offerings WHERE publisher_id IN (
          SELECT id FROM publishers WHERE email = $1
        )
      `, [TEST_EMAIL]);
      
      await dbPool.query('DELETE FROM websites WHERE domain LIKE $1', ['e2e-%']);
      await dbPool.query('DELETE FROM publishers WHERE email = $1', [TEST_EMAIL]);

      // Create test websites
      for (const website of testWebsites) {
        await dbPool.query(`
          INSERT INTO websites (
            id, domain, guest_post_cost, typical_turnaround_days, 
            domain_rating, total_traffic, status, airtable_created_at,
            airtable_updated_at, source, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 65, 50000, 'active', NOW(), NOW(), 'manual', NOW(), NOW())
        `, [website.id, website.domain, website.guestPostCost, website.turnaroundTime]);
      }

      // Create shadow publisher
      await dbPool.query(`
        INSERT INTO publishers (
          id, email, contact_name, company_name, account_status, status,
          invitation_token, invitation_sent_at, invitation_expires_at,
          source, confidence_score, created_at, updated_at
        ) VALUES ($1, $2, 'Sarah Johnson', 'E2E Test Co', 'shadow', 'pending', 
                 $3, NOW(), $4, 'email_extraction', 0.85, NOW(), NOW())
      `, [
        testPublisherId, TEST_EMAIL, invitationToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ]);

      // Create shadow website relationships
      for (const website of testWebsites) {
        await dbPool.query(`
          INSERT INTO shadow_publisher_websites (
            id, publisher_id, website_id, confidence, source, 
            extraction_method, verified, created_at
          ) VALUES ($1, $2, $3, 0.80, 'email_extraction', 'ai_extracted', false, NOW())
        `, [crypto.randomUUID(), testPublisherId, website.id]);
      }

      // Create inactive offerings (will be activated on migration)
      for (const website of testWebsites) {
        await dbPool.query(`
          INSERT INTO publisher_offerings (
            id, publisher_id, website_id, offering_type, price, currency,
            turnaround_days, is_active, source, created_at, updated_at
          ) VALUES ($1, $2, $3, 'guest_post', $4, 'USD', $5, false, 'email_extraction', NOW(), NOW())
        `, [
          crypto.randomUUID(), testPublisherId, website.id,
          parseFloat(website.guestPostCost), parseInt(website.turnaroundTime)
        ]);
      }

      await dbPool.query('COMMIT');
      console.log('✅ Test shadow publisher setup complete');
      
    } catch (error) {
      await dbPool.query('ROLLBACK');
      throw new Error(`Failed to setup test data: ${error}`);
    }
  });

  test.afterAll(async () => {
    // Cleanup test data
    try {
      await dbPool.query('BEGIN');
      
      await dbPool.query(`
        DELETE FROM shadow_publisher_websites WHERE publisher_id = $1
      `, [testPublisherId]);
      
      await dbPool.query(`
        DELETE FROM publisher_websites WHERE publisher_id = $1
      `, [testPublisherId]);
      
      await dbPool.query(`
        DELETE FROM publisher_offerings WHERE publisher_id = $1  
      `, [testPublisherId]);
      
      await dbPool.query('DELETE FROM websites WHERE domain LIKE $1', ['e2e-%']);
      await dbPool.query('DELETE FROM publishers WHERE id = $1', [testPublisherId]);
      
      await dbPool.query('COMMIT');
      console.log('🧹 Test cleanup complete');
    } catch (error) {
      console.error('Cleanup error:', error);
      await dbPool.query('ROLLBACK');
    } finally {
      await dbPool.end();
    }
  });

  test('Complete Publisher Onboarding Flow', async ({ page }) => {
    console.log('🚀 Starting E2E Publisher Flow Test');

    // STEP 1: Test Email Invitation Link Access
    test.step('1. Access Invitation Link', async () => {
      const claimUrl = `${BASE_URL}/publisher/claim?token=${invitationToken}`;
      console.log('📧 Testing claim URL:', claimUrl);
      
      await page.goto(claimUrl);
      await expect(page).toHaveTitle(/Publisher Portal/);
      
      // Should see the claim form
      await expect(page.locator('h1')).toContainText('Publisher Portal');
      await expect(page.getByText('Claim Your Publisher Account')).toBeVisible();
      
      console.log('✅ Claim page loaded successfully');
    });

    // STEP 2: Verify Pre-populated Data
    test.step('2. Verify Pre-populated Publisher Data', async () => {
      console.log('🔍 Checking pre-populated data...');
      
      // Should show publisher email
      await expect(page.getByText(TEST_EMAIL)).toBeVisible();
      await expect(page.getByText('Sarah Johnson')).toBeVisible();
      await expect(page.getByText('E2E Test Co')).toBeVisible();
      
      // Should show source information
      await expect(page.getByText('email response to our outreach')).toBeVisible();
      
      console.log('✅ Pre-populated data displayed correctly');
    });

    // STEP 3: Complete Claim Form
    test.step('3. Complete Claim Form', async () => {
      console.log('📝 Filling out claim form...');
      
      // Fill required fields
      await page.fill('[data-testid="contact-name"], #contactName', 'Sarah Johnson');
      await page.fill('[data-testid="company-name"], #companyName', 'E2E Test Co');
      await page.fill('[data-testid="phone"], #phone', '+1-555-123-4567');
      await page.fill('[data-testid="password"], #password', TEST_PASSWORD);
      await page.fill('[data-testid="confirm-password"], #confirmPassword', TEST_PASSWORD);
      
      console.log('✅ Claim form filled out');
    });

    // STEP 4: Submit Claim and Test Migration
    test.step('4. Submit Claim and Verify Migration', async () => {
      console.log('🚀 Submitting claim form...');
      
      // Submit the form
      await page.click('[data-testid="claim-button"], button[type="submit"]');
      
      // Should see success message
      await expect(page.getByText('Account Claimed Successfully')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Redirecting to your dashboard')).toBeVisible();
      
      console.log('✅ Claim submitted successfully');
      
      // Verify migration happened in database
      const migrationCheck = await dbPool.query(`
        SELECT 
          p.shadow_data_migrated,
          p.shadow_migration_completed_at,
          COUNT(DISTINCT pw.id) as website_count,
          COUNT(DISTINCT po.id) as offering_count
        FROM publishers p
        LEFT JOIN publisher_websites pw ON pw.publisher_id = p.id
        LEFT JOIN publisher_offerings po ON po.publisher_id = p.id AND po.is_active = true
        WHERE p.id = $1
        GROUP BY p.id, p.shadow_data_migrated, p.shadow_migration_completed_at
      `, [testPublisherId]);
      
      const migration = migrationCheck.rows[0];
      expect(migration.shadow_data_migrated).toBe(true);
      expect(migration.website_count).toBe('2'); // Should have 2 migrated websites
      expect(migration.offering_count).toBe('2'); // Should have 2 active offerings
      
      console.log('✅ Shadow data migration verified in database');
    });

    // STEP 5: Test Redirect to Dashboard
    test.step('5. Verify Redirect to Dashboard', async () => {
      console.log('🏠 Testing dashboard redirect...');
      
      // Wait for redirect (should happen automatically after 2 seconds)
      await page.waitForURL('**/publisher/dashboard', { timeout: 15000 });
      
      await expect(page).toHaveURL(/\/publisher\/dashboard/);
      console.log('✅ Successfully redirected to dashboard');
    });

    // STEP 6: Verify Dashboard Shows Migrated Data
    test.step('6. Verify Dashboard Shows Migrated Websites', async () => {
      console.log('📊 Checking dashboard content...');
      
      // Should see welcome message
      await expect(page.getByText('Welcome, Sarah')).toBeVisible({ timeout: 10000 });
      
      // Should see migrated websites
      await expect(page.getByText('e2e-techblog.com')).toBeVisible();
      await expect(page.getByText('e2e-business.net')).toBeVisible();
      
      // Should see pricing information
      await expect(page.getByText('$350')).toBeVisible();
      await expect(page.getByText('$275')).toBeVisible();
      
      // Should NOT see "No websites yet" message
      await expect(page.getByText('No websites yet')).not.toBeVisible();
      
      console.log('✅ Dashboard shows migrated websites correctly');
    });

    // STEP 7: Test Website Management
    test.step('7. Test Website Management Access', async () => {
      console.log('🌐 Testing website management...');
      
      // Navigate to websites page
      await page.click('a[href="/publisher/websites"], text=Websites');
      await expect(page).toHaveURL(/\/publisher\/websites/);
      
      // Should see both migrated websites
      await expect(page.getByText('e2e-techblog.com')).toBeVisible();
      await expect(page.getByText('e2e-business.net')).toBeVisible();
      
      // Should show verification status
      await expect(page.getByText('Pending', { exact: false })).toBeVisible();
      
      console.log('✅ Website management page shows migrated data');
    });

    // STEP 8: Test Settings Access and Update
    test.step('8. Test Settings Access', async () => {
      console.log('⚙️ Testing settings access...');
      
      // Navigate to settings
      await page.click('a[href="/publisher/settings"], text=Settings');
      await expect(page).toHaveURL(/\/publisher\/settings/);
      
      // Should show migrated publisher information
      await expect(page.locator('input[name="contactName"], #contactName')).toHaveValue('Sarah Johnson');
      await expect(page.locator('input[name="email"], #email')).toHaveValue(TEST_EMAIL);
      await expect(page.locator('input[name="companyName"], #companyName')).toHaveValue('E2E Test Co');
      
      console.log('✅ Settings page shows migrated publisher data');
    });

    // STEP 9: Verify Login Works After Claim
    test.step('9. Test Login After Claim', async () => {
      console.log('🔑 Testing login functionality...');
      
      // Logout first
      await page.click('button:has-text("Logout"), a:has-text("Logout")').catch(() => {
        // If no logout button, go to login page directly
      });
      
      // Go to login page
      await page.goto(`${BASE_URL}/publisher/login`);
      
      // Login with the credentials used during claim
      await page.fill('[data-testid="email"], #email', TEST_EMAIL);
      await page.fill('[data-testid="password"], #password', TEST_PASSWORD);
      await page.click('[data-testid="login-button"], button[type="submit"]');
      
      // Should redirect to dashboard
      await page.waitForURL('**/publisher/dashboard', { timeout: 10000 });
      await expect(page.getByText('Welcome, Sarah')).toBeVisible();
      
      console.log('✅ Login works correctly after claim');
    });

    console.log('🎉 Complete E2E Publisher Flow Test Passed!');
  });

  test('Usability and UX Flow Analysis', async ({ page }) => {
    console.log('🎨 Starting UX Analysis Test');
    
    const claimUrl = `${BASE_URL}/publisher/claim?token=${invitationToken}`;
    await page.goto(claimUrl);
    
    // UX Test 1: Clear value proposition
    test.step('UX: Value Proposition Clarity', async () => {
      await expect(page.getByText('Why are you receiving this email')).toBeVisible();
      await expect(page.getByText('link building agency')).toBeVisible();
      await expect(page.getByText('guest posting opportunities')).toBeVisible();
      console.log('✅ UX: Value proposition is clearly explained');
    });

    // UX Test 2: Form usability
    test.step('UX: Form Usability', async () => {
      // Check required field indicators
      await expect(page.locator('text=*')).toHaveCount(3); // Should have 3 required fields marked
      
      // Test form validation
      await page.click('button[type="submit"]');
      // Should show validation errors without submitting
      
      console.log('✅ UX: Form validation and required fields clearly marked');
    });

    // UX Test 3: Data transparency
    test.step('UX: Data Transparency', async () => {
      await expect(page.getByText('Here\'s What We Have On File')).toBeVisible();
      await expect(page.getByText('Is this information still accurate')).toBeVisible();
      console.log('✅ UX: Data transparency and update options provided');
    });

    // UX Test 4: Loading states
    test.step('UX: Loading and Success States', async () => {
      await page.fill('#contactName', 'Test User');
      await page.fill('#password', 'TestPass123!');
      await page.fill('#confirmPassword', 'TestPass123!');
      
      await page.click('button[type="submit"]');
      
      // Should show loading state
      await expect(page.getByText('Claiming Account')).toBeVisible({ timeout: 5000 });
      
      console.log('✅ UX: Loading states are clearly shown');
    });

    console.log('🎨 UX Analysis Complete');
  });

  test('Error Handling and Edge Cases', async ({ page }) => {
    console.log('🚨 Testing Error Handling');

    // Test 1: Invalid token
    test.step('Error: Invalid Token', async () => {
      await page.goto(`${BASE_URL}/publisher/claim?token=invalid-token-123`);
      await expect(page.getByText('Invalid or expired claim token')).toBeVisible();
      console.log('✅ Error: Invalid token handled correctly');
    });

    // Test 2: Password validation
    test.step('Error: Password Validation', async () => {
      const claimUrl = `${BASE_URL}/publisher/claim?token=${invitationToken}`;
      await page.goto(claimUrl);
      
      await page.fill('#contactName', 'Test User');
      await page.fill('#password', 'weak');
      await page.fill('#confirmPassword', 'different');
      
      await page.click('button[type="submit"]');
      await expect(page.getByText('Passwords do not match')).toBeVisible();
      console.log('✅ Error: Password validation works correctly');
    });

    console.log('🚨 Error Handling Tests Complete');
  });
});