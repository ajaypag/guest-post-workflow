import { test, expect } from '@playwright/test';

test('Debug creator info display', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3001/login');
  await page.fill('input[type="email"]', 'ajay@outreachlabs.com');
  await page.fill('input[type="password"]', 'FA64!I$nrbCauS^d');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to home
  await page.waitForURL('http://localhost:3001/');
  
  // Navigate to the specific vetted sites request
  await page.goto('http://localhost:3001/internal/vetted-sites/requests/54319a09-1f46-403c-9b7d-ee3c34369cbb');
  
  // Wait for page to load
  await page.waitForSelector('h1:text("Request Detail")', { timeout: 10000 });
  
  // Check what's in the Request Information panel
  const requestInfoPanel = await page.locator('.bg-white.rounded-lg.shadow-sm.border.border-gray-100').nth(0);
  const submittedBySection = await requestInfoPanel.locator('div:has-text("Submitted By")');
  
  console.log('Request Information Panel content:');
  console.log(await requestInfoPanel.textContent());
  
  if (await submittedBySection.count() > 0) {
    console.log('Found Submitted By section:');
    console.log(await submittedBySection.textContent());
  } else {
    console.log('No Submitted By section found');
  }
  
  // Check console logs for debug info
  page.on('console', msg => {
    if (msg.text().includes('Request data:') || msg.text().includes('Found creator:')) {
      console.log('Server log:', msg.text());
    }
  });
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-creator-info.png', fullPage: true });
  
  // Keep browser open for manual inspection
  await page.pause();
});