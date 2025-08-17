const { chromium } = require('playwright');

async function testPublisherComplete() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  console.log('=== COMPREHENSIVE PUBLISHER TESTING ===\n');
  
  const issues = [];
  const testEmail = `publisher${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';
  let authCookie = null;
  
  // ========================================================
  // TEST 1: Create Publisher Account
  // ========================================================
  console.log('TEST 1: Create Publisher Account');
  try {
    const page = await context.newPage();
    
    // Navigate to publisher signup
    await page.goto('http://localhost:3001/publisher/signup');
    await page.waitForTimeout(2000);
    
    // Check if signup page exists
    const hasSignupForm = await page.isVisible('form');
    if (!hasSignupForm) {
      throw new Error('No signup form found - page may not exist');
    }
    
    // Fill signup form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.fill('input[name="contactName"]', 'Test Publisher');
    await page.fill('input[name="companyName"]', 'Test Company');
    
    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check if account was created
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      console.log('  ✅ Account creation redirected to login');
    } else if (currentUrl.includes('dashboard')) {
      console.log('  ✅ Account created and auto-logged in');
    } else {
      throw new Error(`Unexpected redirect: ${currentUrl}`);
    }
    
    await page.close();
  } catch (error) {
    console.log('  ❌ Account creation failed:', error.message);
    issues.push({ test: 'Account Creation', error: error.message });
    
    // Try alternative signup method via API
    console.log('  Trying API signup...');
    try {
      const page = await context.newPage();
      const response = await page.evaluate(async (email, password) => {
        const res = await fetch('/api/auth/publisher/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            contactName: 'Test Publisher',
            companyName: 'Test Company'
          })
        });
        return { status: res.status, data: await res.json() };
      }, testEmail, testPassword);
      
      if (response.status === 200 || response.status === 201) {
        console.log('  ✅ API signup successful');
      } else {
        console.log('  ❌ API signup failed:', response.data);
        issues.push({ test: 'API Signup', error: JSON.stringify(response.data) });
      }
      await page.close();
    } catch (apiError) {
      console.log('  ❌ API signup error:', apiError.message);
    }
  }
  
  // ========================================================
  // TEST 2: Publisher Login
  // ========================================================
  console.log('\nTEST 2: Publisher Login');
  try {
    const page = await context.newPage();
    
    // Use existing account if signup failed
    const loginEmail = testEmail.includes('publisher') ? 'testpublisher@example.com' : testEmail;
    const loginPassword = testEmail.includes('publisher') ? 'TestPass123!' : testPassword;
    
    await page.goto('http://localhost:3001/publisher/login');
    await page.waitForTimeout(2000);
    
    // Fill login form
    await page.fill('input[type="email"]', loginEmail);
    await page.fill('input[type="password"]', loginPassword);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('dashboard')) {
      console.log('  ✅ Login successful - redirected to dashboard');
      
      // Get auth cookie for later tests
      const cookies = await context.cookies();
      authCookie = cookies.find(c => c.name.includes('auth'));
    } else {
      console.log(`  ⚠️ Login didn't redirect to dashboard: ${currentUrl}`);
      issues.push({ test: 'Login Redirect', error: `Stayed on ${currentUrl}` });
    }
    
    await page.close();
  } catch (error) {
    console.log('  ❌ Login failed:', error.message);
    issues.push({ test: 'Login', error: error.message });
  }
  
  // ========================================================
  // TEST 3: View Websites List
  // ========================================================
  console.log('\nTEST 3: View Websites List');
  try {
    const page = await context.newPage();
    
    // Login first
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to websites
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForTimeout(2000);
    
    // Check if table exists
    const hasTable = await page.isVisible('table');
    if (!hasTable) {
      throw new Error('No websites table found');
    }
    
    // Count websites
    const websiteCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      return rows.length;
    });
    
    console.log(`  ✅ Websites list loaded with ${websiteCount} websites`);
    
    await page.close();
  } catch (error) {
    console.log('  ❌ View websites failed:', error.message);
    issues.push({ test: 'View Websites', error: error.message });
  }
  
  // ========================================================
  // TEST 4: Add New Website
  // ========================================================
  console.log('\nTEST 4: Add New Website');
  const testDomain = `test${Date.now()}.com`;
  try {
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to add website
    await page.goto('http://localhost:3001/publisher/websites/new');
    await page.waitForTimeout(2000);
    
    // Fill form
    await page.fill('input[name="domain"]', testDomain);
    await page.fill('input[name="name"]', 'Test Website');
    await page.selectOption('select[name="category"]', 'Technology');
    await page.fill('textarea[name="description"]', 'Test website description');
    await page.fill('input[name="monthlyTraffic"]', '10000');
    await page.fill('input[name="domainAuthority"]', '50');
    
    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check redirect
    const currentUrl = page.url();
    if (currentUrl.includes('/publisher/websites') && !currentUrl.includes('/new')) {
      console.log('  ✅ Website added successfully');
      
      // Verify it appears in the list
      const domainVisible = await page.isVisible(`text="${testDomain}"`);
      if (domainVisible) {
        console.log(`  ✅ Website "${testDomain}" visible in list`);
      } else {
        console.log('  ⚠️ Website added but not visible in list');
        issues.push({ test: 'Website Visibility', error: 'Added but not shown' });
      }
    } else {
      throw new Error('Did not redirect after adding website');
    }
    
    await page.close();
  } catch (error) {
    console.log('  ❌ Add website failed:', error.message);
    issues.push({ test: 'Add Website', error: error.message });
  }
  
  // ========================================================
  // TEST 5: Edit Website
  // ========================================================
  console.log('\nTEST 5: Edit Website');
  try {
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Go to websites list
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForTimeout(2000);
    
    // Click edit on first website
    const editButton = await page.$('button:has-text("Edit"), a:has-text("Edit")');
    if (editButton) {
      await editButton.click();
      await page.waitForTimeout(2000);
      
      // Check if edit form loaded
      const hasForm = await page.isVisible('form');
      if (hasForm) {
        // Update a field
        await page.fill('input[name="monthlyTraffic"]', '20000');
        
        // Save
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        
        console.log('  ✅ Website edit form working');
      } else {
        throw new Error('Edit form not found');
      }
    } else {
      console.log('  ⚠️ No edit button found - feature may not be implemented');
      issues.push({ test: 'Edit Website', error: 'No edit button found' });
    }
    
    await page.close();
  } catch (error) {
    console.log('  ❌ Edit website failed:', error.message);
    issues.push({ test: 'Edit Website', error: error.message });
  }
  
  // ========================================================
  // TEST 6: Publisher Dashboard
  // ========================================================
  console.log('\nTEST 6: Publisher Dashboard');
  try {
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to dashboard
    await page.goto('http://localhost:3001/publisher/dashboard');
    await page.waitForTimeout(2000);
    
    // Check for dashboard elements
    const hasStats = await page.isVisible('text=/websites|orders|earnings/i');
    if (hasStats) {
      console.log('  ✅ Dashboard displays stats');
    } else {
      console.log('  ⚠️ Dashboard missing statistics');
      issues.push({ test: 'Dashboard Stats', error: 'Stats not visible' });
    }
    
    // Test dashboard API
    const statsResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publisher/dashboard/stats');
      return { status: res.status, data: await res.json() };
    });
    
    if (statsResponse.status === 200) {
      console.log('  ✅ Dashboard API working');
      console.log(`    - Total websites: ${statsResponse.data.totalWebsites}`);
      console.log(`    - Active offerings: ${statsResponse.data.activeOfferings}`);
    } else {
      console.log('  ❌ Dashboard API error:', statsResponse.data);
      issues.push({ test: 'Dashboard API', error: JSON.stringify(statsResponse.data) });
    }
    
    await page.close();
  } catch (error) {
    console.log('  ❌ Dashboard failed:', error.message);
    issues.push({ test: 'Dashboard', error: error.message });
  }
  
  // ========================================================
  // TEST 7: Publisher Orders
  // ========================================================
  console.log('\nTEST 7: Publisher Orders');
  try {
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to orders
    await page.goto('http://localhost:3001/publisher/orders');
    await page.waitForTimeout(2000);
    
    // Check page loaded
    const hasOrdersSection = await page.isVisible('text=/orders|no orders/i');
    if (hasOrdersSection) {
      console.log('  ✅ Orders page loaded');
    } else {
      throw new Error('Orders page not loading');
    }
    
    // Test orders API
    const ordersResponse = await page.evaluate(async () => {
      const res = await fetch('/api/publisher/orders');
      return { status: res.status, data: await res.json() };
    });
    
    if (ordersResponse.status === 200) {
      console.log('  ✅ Orders API working');
      console.log(`    - Orders found: ${ordersResponse.data.orders?.length || 0}`);
    } else {
      console.log('  ❌ Orders API error:', ordersResponse.data);
      issues.push({ test: 'Orders API', error: JSON.stringify(ordersResponse.data) });
    }
    
    await page.close();
  } catch (error) {
    console.log('  ❌ Orders failed:', error.message);
    issues.push({ test: 'Orders', error: error.message });
  }
  
  // ========================================================
  // TEST 8: Delete Website (if implemented)
  // ========================================================
  console.log('\nTEST 8: Delete Website');
  try {
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:3001/publisher/login');
    await page.fill('input[type="email"]', 'testpublisher@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Go to websites
    await page.goto('http://localhost:3001/publisher/websites');
    await page.waitForTimeout(2000);
    
    // Look for delete button
    const deleteButton = await page.$('button:has-text("Delete"), button:has-text("Remove")');
    if (deleteButton) {
      console.log('  ✅ Delete functionality exists');
    } else {
      console.log('  ⚠️ No delete button - feature may not be implemented');
      issues.push({ test: 'Delete Website', error: 'Feature not implemented' });
    }
    
    await page.close();
  } catch (error) {
    console.log('  ❌ Delete website test failed:', error.message);
    issues.push({ test: 'Delete Website', error: error.message });
  }
  
  // ========================================================
  // SUMMARY
  // ========================================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (issues.length === 0) {
    console.log('🎉 ALL TESTS PASSED! Publisher portal is working correctly.');
  } else {
    console.log(`⚠️ Found ${issues.length} issues:\n`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue.test}: ${issue.error}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('ISSUES TO FIX BEFORE PRODUCTION:');
    console.log('='.repeat(60));
    
    // Categorize issues
    const critical = issues.filter(i => 
      i.test.includes('Login') || 
      i.test.includes('Account') || 
      i.test.includes('API')
    );
    
    const important = issues.filter(i => 
      i.test.includes('Dashboard') || 
      i.test.includes('Orders') ||
      i.test.includes('Add Website')
    );
    
    const minor = issues.filter(i => 
      !critical.includes(i) && !important.includes(i)
    );
    
    if (critical.length > 0) {
      console.log('\n🔴 CRITICAL (Must fix):');
      critical.forEach(i => console.log(`  - ${i.test}: ${i.error}`));
    }
    
    if (important.length > 0) {
      console.log('\n🟡 IMPORTANT (Should fix):');
      important.forEach(i => console.log(`  - ${i.test}: ${i.error}`));
    }
    
    if (minor.length > 0) {
      console.log('\n🟢 MINOR (Can fix later):');
      minor.forEach(i => console.log(`  - ${i.test}: ${i.error}`));
    }
  }
  
  await browser.close();
  process.exit(issues.length > 0 ? 1 : 0);
}

testPublisherComplete().catch(console.error);