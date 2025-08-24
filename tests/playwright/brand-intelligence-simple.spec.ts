import { test, expect } from '@playwright/test';

test('Brand Intelligence page shows gaps correctly', async ({ page }) => {
  // Skip login and directly test the brand intelligence page with proper auth
  await page.goto('http://localhost:3000/login');
  
  // Fill login form
  await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for redirect and navigate to brand intelligence
  await page.waitForURL('**/clients**');
  await page.goto('http://localhost:3000/clients/0812d99a-2479-4baf-9607-c3ee4371cd5d/brand-intelligence');
  
  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'brand-intelligence-simple-test.png', fullPage: true });
  
  // Check if the page title exists
  const pageTitle = page.locator('h1, h2, h3').filter({ hasText: /Brand Intelligence|Brand Intelligence Generator/ });
  await expect(pageTitle).toBeVisible({ timeout: 10000 });
  
  // Check for information gaps section
  const gapsSection = page.locator('text=Information Gaps Identified');
  await expect(gapsSection).toBeVisible({ timeout: 5000 });
  
  // Check for gap items (should now exist with our test data)
  const gapItems = page.locator('.bg-yellow-50');
  await expect(gapItems.first()).toBeVisible({ timeout: 5000 });
  
  // Verify we have multiple gap items
  const gapCount = await gapItems.count();
  expect(gapCount).toBeGreaterThan(0);
  console.log(`Found ${gapCount} gap items`);
  
  // Check specific gap content
  await expect(page.locator('text=Pricing')).toBeVisible();
  await expect(page.locator('text=What is your pricing model')).toBeVisible();
  await expect(page.locator('text=HIGH')).toBeVisible();
  
  console.log('✅ Brand Intelligence gaps are rendering correctly');
});