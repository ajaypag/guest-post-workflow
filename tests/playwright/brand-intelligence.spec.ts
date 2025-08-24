import { test, expect } from '@playwright/test';

test.describe('Brand Intelligence Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'ajay@outreachlabs.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect after login
    await page.waitForURL('http://localhost:3000/**');
  });

  test('should display Brand Intelligence page and show questions/gaps if available', async ({ page }) => {
    // Navigate to the specific brand intelligence page
    await page.goto('http://localhost:3000/clients/0812d99a-2479-4baf-9607-c3ee4371cd5d/brand-intelligence');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if page loads successfully
    await expect(page.locator('h1')).toContainText('Brand Intelligence Generator');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'brand-intelligence-test.png', fullPage: true });
    
    // Check for phase indicators
    await expect(page.locator('text=Deep Research')).toBeVisible();
    await expect(page.locator('text=Questionnaire')).toBeVisible();
    await expect(page.locator('text=Brief Creation')).toBeVisible();
    
    // Check if research has been completed and gaps section exists
    const gapsSection = page.locator('text=Information Gaps Identified');
    const hasGaps = await gapsSection.isVisible();
    
    if (hasGaps) {
      console.log('✅ Found Information Gaps section');
      
      // Check for gap items
      const gapItems = page.locator('.bg-yellow-50');
      const gapCount = await gapItems.count();
      console.log(`Found ${gapCount} gap items`);
      
      if (gapCount > 0) {
        // Check first gap item structure
        const firstGap = gapItems.first();
        await expect(firstGap).toBeVisible();
        
        // Check for importance badge
        const importanceBadge = firstGap.locator('.bg-yellow-200');
        await expect(importanceBadge).toBeVisible();
        
        // Check for category
        const category = firstGap.locator('.text-gray-900');
        await expect(category).toBeVisible();
        
        // Check for question text
        const question = firstGap.locator('.text-gray-700');
        await expect(question).toBeVisible();
        
        console.log('✅ Gap items are properly structured');
      } else {
        console.log('❌ No gap items found despite gaps section being visible');
      }
    } else {
      console.log('❌ No Information Gaps section found');
    }
    
    // Log page content for debugging
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    
    // Check if there are any console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });
});