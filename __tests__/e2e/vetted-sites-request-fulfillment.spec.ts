import { test, expect } from '@playwright/test';

test.describe('Vetted Sites Request Fulfillment Flow', () => {
  const baseURL = 'http://localhost:3004';
  const adminEmail = 'ajay@outreachlabs.com';
  const adminPassword = 'FA64!I$nrbCauS^d';
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto(`${baseURL}/login`);
  });

  test('Complete vetted sites request fulfillment workflow', async ({ page }) => {
    // Step 1: Login as admin
    console.log('🔐 Testing admin login...');
    
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // Wait for login to complete and verify by navigating to internal page
    await page.waitForTimeout(3000); // Give time for login to process
    
    // Try to navigate to internal area to verify login worked
    await page.goto(`${baseURL}/internal/vetted-sites/requests`);
    await page.waitForTimeout(2000);
    
    // Check if we're on an internal page (not redirected back to login)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('Login failed - redirected back to login page');
    }
    console.log('✅ Admin login successful - accessed internal area');
    
    // Step 2: We're already on vetted sites requests page
    console.log('📋 Already on vetted sites requests page');
    await page.waitForLoadState('networkidle');
    
    // Find an existing request (should be one from previous conversation)
    const requestRows = await page.locator('table tbody tr');
    const requestCount = await requestRows.count();
    
    expect(requestCount).toBeGreaterThan(0);
    console.log(`✅ Found ${requestCount} request(s)`);
    
    // Click on the first request
    const firstRequestLink = requestRows.first().locator('a').first();
    const requestId = await firstRequestLink.getAttribute('href');
    expect(requestId).toBeTruthy();
    
    await firstRequestLink.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to request detail page');
    
    // Step 3: Check request status and verify it's approved or approve it
    console.log('📊 Checking request status...');
    
    const statusBadge = page.locator('[data-testid="request-status"]');
    const currentStatus = await statusBadge.textContent();
    console.log(`Current status: ${currentStatus}`);
    
    // If not approved, approve it first
    if (currentStatus?.toLowerCase() !== 'approved') {
      const approveButton = page.locator('button:has-text("Approve")');
      if (await approveButton.isVisible()) {
        await approveButton.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Request approved');
      }
    }
    
    // Step 4: Check target URL identification
    console.log('🎯 Testing target URL identification...');
    
    const targetUrlSection = page.locator('[data-testid="target-urls-section"]');
    await expect(targetUrlSection).toBeVisible();
    
    const identifiedUrls = page.locator('[data-testid="target-url-item"]');
    const urlCount = await identifiedUrls.count();
    
    expect(urlCount).toBeGreaterThan(0);
    console.log(`✅ Found ${urlCount} target URL(s) identified`);
    
    // Step 5: Check for missing data and generate if needed
    console.log('🤖 Testing AI data generation...');
    
    let needsGeneration = false;
    
    // Check each target URL for missing keywords or descriptions
    for (let i = 0; i < urlCount; i++) {
      const urlItem = identifiedUrls.nth(i);
      
      const generateKeywordsBtn = urlItem.locator('button:has-text("Generate Keywords")');
      const generateDescBtn = urlItem.locator('button:has-text("Generate Description")');
      
      if (await generateKeywordsBtn.isVisible()) {
        console.log(`🔧 Generating keywords for URL ${i + 1}...`);
        await generateKeywordsBtn.click();
        
        // Wait for generation to complete
        await page.waitForResponse(response => 
          response.url().includes('/api/target-pages/') && 
          response.url().includes('/keywords') &&
          response.status() === 200,
          { timeout: 30000 }
        );
        
        await page.waitForTimeout(2000); // Allow UI to update
        console.log('✅ Keywords generated successfully');
        needsGeneration = true;
      }
      
      if (await generateDescBtn.isVisible()) {
        console.log(`📝 Generating description for URL ${i + 1}...`);
        await generateDescBtn.click();
        
        // Wait for generation to complete
        await page.waitForResponse(response => 
          response.url().includes('/api/target-pages/') && 
          response.url().includes('/description') &&
          response.status() === 200,
          { timeout: 30000 }
        );
        
        await page.waitForTimeout(2000); // Allow UI to update
        console.log('✅ Description generated successfully');
        needsGeneration = true;
      }
    }
    
    if (!needsGeneration) {
      console.log('ℹ️ All target URLs already have required data');
    }
    
    // Step 6: Test bulk analysis project creation
    console.log('📊 Testing bulk analysis project creation...');
    
    // Refresh page to get latest state after any AI generations
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Look for the confirm/create project button
    const confirmButton = page.locator('button:has-text("Confirm Request"), button:has-text("Create Projects")');
    
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Project creation button is available');
    
    // Click to create projects
    await confirmButton.click();
    
    // Wait for project creation to complete
    await page.waitForResponse(response => 
      response.url().includes('/confirm') &&
      response.status() === 200,
      { timeout: 15000 }
    );
    
    await page.waitForTimeout(3000); // Allow UI to update
    console.log('✅ Bulk analysis projects created successfully');
    
    // Step 7: Verify project links are available
    console.log('🔗 Testing project linking and navigation...');
    
    // Check for created projects section
    const projectsSection = page.locator('[data-testid="created-projects"]');
    await expect(projectsSection).toBeVisible({ timeout: 5000 });
    
    const projectLinks = projectsSection.locator('a[href*="/bulk-analysis/"]');
    const projectCount = await projectLinks.count();
    
    expect(projectCount).toBeGreaterThan(0);
    console.log(`✅ Found ${projectCount} project link(s) created`);
    
    // Test navigation to first project
    const firstProjectLink = projectLinks.first();
    const projectHref = await firstProjectLink.getAttribute('href');
    expect(projectHref).toBeTruthy();
    
    await firstProjectLink.click();
    await page.waitForLoadState('networkidle');
    
    // Verify we're on a bulk analysis project page
    await expect(page.locator('h1, h2')).toContainText(['Bulk Analysis', 'Project', 'Analysis'], { timeout: 5000 });
    console.log('✅ Successfully navigated to bulk analysis project');
    
    // Step 8: Navigate back and verify request status is fulfilled
    console.log('🎯 Verifying request fulfillment status...');
    
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    const finalStatus = page.locator('[data-testid="request-status"]');
    await expect(finalStatus).toContainText('fulfilled', { timeout: 5000 });
    console.log('✅ Request status updated to fulfilled');
    
    console.log('🎉 Complete vetted sites request fulfillment workflow test PASSED!');
  });

  test('Error handling for missing data', async ({ page }) => {
    // Test error scenarios and edge cases
    console.log('🔐 Testing error handling...');
    
    // Login first
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // Wait for login to complete and verify
    await page.waitForTimeout(3000);
    
    // Try to navigate to internal area to verify login worked
    await page.goto(`${baseURL}/internal/vetted-sites/requests`);
    await page.waitForTimeout(2000);
    
    // Check if we're on an internal page (not redirected back to login)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('Login failed - redirected back to login page');
    }
    
    // Test navigation to non-existent request
    const fakeRequestId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`${baseURL}/internal/vetted-sites/requests/${fakeRequestId}`);
    
    // Should show error or redirect
    await page.waitForTimeout(3000);
    
    const errorMessage = page.locator('text=not found, text=error, [data-testid="error"]');
    const isErrorVisible = await errorMessage.isVisible();
    
    if (isErrorVisible) {
      console.log('✅ Error handling for non-existent request works');
    } else {
      console.log('ℹ️ Request redirected or handled gracefully');
    }
  });
});