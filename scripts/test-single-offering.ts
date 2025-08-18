#!/usr/bin/env npx tsx

/**
 * Test script to verify single offering creation works correctly
 */

const SINGLE_BASE_URL = 'http://localhost:3005';

const SINGLE_TEST_DATA = {
  email: 'test.publisher@example.com',
  password: 'TestPassword123!',
  testWebsite: {
    domain: 'testsingleoffering.com',
    categories: ['Technology'],
    niche: ['SaaS'],
    websiteType: ['Blog'],
    monthlyTraffic: 25000,
    domainRating: 35,
    websiteLanguage: 'en',
    targetAudience: 'Tech startups',
    offerings: [
      {
        offeringType: 'guest_post',
        basePrice: 12000, // $120.00 in cents
        currency: 'USD',
        turnaroundDays: 5,
        minWordCount: 600,
        maxWordCount: 1800,
        currentAvailability: 'available',
        expressAvailable: false
      }
    ]
  }
};

async function singleLogin(): Promise<string> {
  console.log('🔐 Logging in as test publisher...');
  
  const response = await fetch(`${SINGLE_BASE_URL}/api/auth/publisher/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: SINGLE_TEST_DATA.email,
      password: SINGLE_TEST_DATA.password
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${response.status} - ${error}`);
  }

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No session cookie received');
  }

  const sessionMatch = setCookie.match(/auth-token-publisher=([^;]+)/);
  if (!sessionMatch) {
    throw new Error('Could not extract session token');
  }

  console.log('✅ Login successful');
  return sessionMatch[1];
}

async function testCreateWebsiteWithSingleOffering(sessionToken: string): Promise<void> {
  console.log('🌐 Testing website creation with single offering...');
  
  const response = await fetch(`${SINGLE_BASE_URL}/api/publisher/websites/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth-token-publisher=${sessionToken}`,
    },
    body: JSON.stringify(SINGLE_TEST_DATA.testWebsite),
  });

  const responseText = await response.text();
  console.log(`Response status: ${response.status}`);
  console.log(`Response body: ${responseText}`);

  if (!response.ok) {
    throw new Error(`Website creation failed: ${response.status} - ${responseText}`);
  }

  const result = JSON.parse(responseText);
  console.log('✅ Website created successfully!');
  console.log(`   Website ID: ${result.websiteId}`);
  console.log(`   Offerings count: ${result.offeringsCount}`);
  console.log(`   Offering IDs: ${result.offeringIds.join(', ')}`);
  
  if (result.offeringsCount !== 1) {
    throw new Error(`Expected 1 offering, got ${result.offeringsCount}`);
  }
}

async function singleMain() {
  try {
    console.log('🧪 Single Offering Test');
    console.log('=======================');
    
    const sessionToken = await singleLogin();
    await testCreateWebsiteWithSingleOffering(sessionToken);
    
    console.log('');
    console.log('🎉 All tests passed! Single offering works correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  singleMain();
}