// Test publisher authentication and page access
const puppeteer = require('puppeteer');

async function testPublisherFlow() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('Testing Publisher Portal Flow\n');
  console.log('================================\n');
  
  try {
    // 1. Test signup page
    console.log('1. Testing Signup Page...');
    await page.goto('http://localhost:3000/publisher/signup');
    const signupTitle = await page.title();
    console.log(`   ✅ Signup page loaded: ${signupTitle}`);
    
    // Check for form fields
    const hasEmailField = await page.$('input[name="email"]') !== null;
    const hasPasswordField = await page.$('input[name="password"]') !== null;
    const hasNameField = await page.$('input[name="name"]') !== null;
    const hasCompanyField = await page.$('input[name="company"]') !== null;
    
    console.log(`   Email field: ${hasEmailField ? '✅' : '❌'}`);
    console.log(`   Password field: ${hasPasswordField ? '✅' : '❌'}`);
    console.log(`   Name field: ${hasNameField ? '✅' : '❌'}`);
    console.log(`   Company field: ${hasCompanyField ? '✅' : '❌'}`);
    
    // 2. Test login page
    console.log('\n2. Testing Login Page...');
    await page.goto('http://localhost:3000/publisher/login');
    const loginTitle = await page.title();
    console.log(`   ✅ Login page loaded: ${loginTitle}`);
    
    // Check for login form
    const hasLoginEmail = await page.$('input[name="email"]') !== null;
    const hasLoginPassword = await page.$('input[name="password"]') !== null;
    const hasLoginButton = await page.$('button[type="submit"]') !== null;
    
    console.log(`   Email field: ${hasLoginEmail ? '✅' : '❌'}`);
    console.log(`   Password field: ${hasLoginPassword ? '✅' : '❌'}`);
    console.log(`   Submit button: ${hasLoginButton ? '✅' : '❌'}`);
    
    // 3. Check redirect when accessing protected pages
    console.log('\n3. Testing Protected Page Redirect...');
    await page.goto('http://localhost:3000/publisher/websites');
    const currentUrl = page.url();
    if (currentUrl.includes('/publisher/login')) {
      console.log('   ✅ Correctly redirected to login');
    } else {
      console.log(`   ⚠️ Unexpected URL: ${currentUrl}`);
    }
    
    // 4. Test verify page
    console.log('\n4. Testing Verify Page...');
    await page.goto('http://localhost:3000/publisher/verify?token=test');
    const verifyContent = await page.content();
    if (verifyContent.includes('verify') || verifyContent.includes('Verify')) {
      console.log('   ✅ Verify page accessible');
    }
    
    // 5. Test API endpoints
    console.log('\n5. Testing API Endpoints...');
    
    // Test search API (should require auth)
    const searchResponse = await page.evaluate(async () => {
      const response = await fetch('/api/publisher/websites/search?domain=example.com');
      return { status: response.status, ok: response.ok };
    });
    console.log(`   Search API: ${searchResponse.status === 401 ? '✅ Protected (401)' : `Status: ${searchResponse.status}`}`);
    
    // Test add API (should require auth)
    const addResponse = await page.evaluate(async () => {
      const response = await fetch('/api/publisher/websites/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'test.com' })
      });
      return { status: response.status, ok: response.ok };
    });
    console.log(`   Add API: ${addResponse.status === 401 ? '✅ Protected (401)' : `Status: ${addResponse.status}`}`);
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  testPublisherFlow();
} catch(e) {
  console.log('Puppeteer not installed. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install puppeteer', { stdio: 'inherit' });
  console.log('Puppeteer installed. Please run the script again.');
}