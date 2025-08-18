import { test, expect } from '@playwright/test';

test.describe('Publisher Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/publisher/login');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check page loaded - using id selectors since the form uses id not name
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    console.log('✅ Login page loaded successfully');
  });

  test('should login with test credentials', async ({ page }) => {
    await page.goto('/publisher/login');
    await page.waitForLoadState('networkidle');
    
    // Fill login form using id selectors
    await page.fill('input#email', 'test.publisher@example.com');
    await page.fill('input#password', 'TestPassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/publisher', { timeout: 10000 });
    
    // Check dashboard loaded
    const heading = page.locator('h1');
    await expect(heading).toContainText('Dashboard');
    
    console.log('✅ Login successful');
  });

  test('should show publisher navigation', async ({ page }) => {
    // First login
    await page.goto('/publisher/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', 'test.publisher@example.com');
    await page.fill('input#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/publisher', { timeout: 10000 });
    
    // Check navigation items
    await expect(page.locator('nav a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('nav a:has-text("My Websites")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Offerings")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Orders")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Invoices")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Analytics")')).toBeVisible();
    
    console.log('✅ Navigation menu is visible');
  });

  test('should navigate to websites page', async ({ page }) => {
    // Login first
    await page.goto('/publisher/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', 'test.publisher@example.com');
    await page.fill('input#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/publisher', { timeout: 10000 });
    
    // Click on My Websites
    await page.click('nav a:has-text("My Websites")');
    await page.waitForURL('**/publisher/websites');
    
    // Check page loaded
    await expect(page.locator('h1')).toContainText('My Websites');
    
    // Check if test website is visible
    const websiteCard = page.locator('text=testpublisher.com');
    const hasWebsite = await websiteCard.isVisible().catch(() => false);
    
    if (hasWebsite) {
      console.log('✅ Test website is visible');
    } else {
      console.log('⚠️ Test website not found in list');
    }
  });

  test('should navigate to offerings page', async ({ page }) => {
    // Login first
    await page.goto('/publisher/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', 'test.publisher@example.com');
    await page.fill('input#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/publisher', { timeout: 10000 });
    
    // Click on Offerings
    await page.click('nav a:has-text("Offerings")');
    await page.waitForURL('**/publisher/offerings');
    
    // Check page loaded
    await expect(page.locator('h1')).toContainText('My Offerings');
    await expect(page.locator('button:has-text("New Offering")')).toBeVisible();
    
    console.log('✅ Offerings page loaded');
    
    // Check if test offering is visible
    const offeringCard = page.locator('text=Guest Post').first();
    const hasOffering = await offeringCard.isVisible().catch(() => false);
    
    if (hasOffering) {
      console.log('✅ Test offering is visible');
    } else {
      console.log('⚠️ Test offering not found');
    }
  });

  test('should check for missing pages', async ({ page }) => {
    // Login first
    await page.goto('/publisher/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', 'test.publisher@example.com');
    await page.fill('input#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/publisher', { timeout: 10000 });
    
    const missingPages = [];
    
    // Test New Offering page
    await page.click('nav a:has-text("Offerings")');
    await page.waitForURL('**/publisher/offerings');
    await page.click('button:has-text("New Offering")');
    
    // Check if page exists or is 404
    const newOfferingUrl = page.url();
    if (newOfferingUrl.includes('/offerings/new')) {
      const pageContent = await page.content();
      if (pageContent.includes('404') || pageContent.includes('not found')) {
        missingPages.push('/publisher/offerings/new');
        console.log('❌ MISSING: /publisher/offerings/new');
      } else {
        console.log('✅ /publisher/offerings/new exists');
      }
    }
    
    // Report findings
    if (missingPages.length > 0) {
      console.log('\n🚨 Missing Pages Found:');
      missingPages.forEach(page => console.log(`  - ${page}`));
    }
  });
});