#!/usr/bin/env npx tsx

/**
 * Test script to verify multiple offerings work correctly
 */

const MULTIPLE_BASE_URL = 'http://localhost:3005';

const MULTIPLE_TEST_DATA = {
  email: 'test.publisher@example.com',
  password: 'TestPassword123!',
  testWebsite: {
    domain: 'testmultipleofferings.com',
    categories: ['Technology', 'Business'],
    niche: ['SaaS', 'B2B'],
    websiteType: ['Blog'],
    monthlyTraffic: 50000,
    domainRating: 45,
    websiteLanguage: 'en',
    targetAudience: 'Tech professionals and business owners',
    offerings: [
      {
        offeringType: 'guest_post',
        basePrice: 15000, // $150.00 in cents
        currency: 'USD',
        turnaroundDays: 7,
        minWordCount: 800,
        maxWordCount: 2500,
        currentAvailability: 'available',
        expressAvailable: true,
        expressPrice: 22500, // $225.00 in cents
        expressDays: 3
      },
      {
        offeringType: 'link_insertion',
        basePrice: 8000, // $80.00 in cents
        currency: 'USD',
        turnaroundDays: 3,
        minWordCount: 0,
        maxWordCount: 0,
        currentAvailability: 'available',
        expressAvailable: false
      }
    ]
  }
};

async function multipleLogin(): Promise<string> {
  console.log('🔐 Logging in as test publisher...');
  
  const response = await fetch(`${MULTIPLE_BASE_URL}/api/auth/publisher/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: MULTIPLE_TEST_DATA.email,
      password: MULTIPLE_TEST_DATA.password
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${response.status} - ${error}`);
  }

  // Extract session cookie
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

async function testCreateWebsiteWithMultipleOfferings(sessionToken: string): Promise<void> {
  console.log('🌐 Testing website creation with multiple offerings...');
  
  const response = await fetch(`${MULTIPLE_BASE_URL}/api/publisher/websites/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth-token-publisher=${sessionToken}`,
    },
    body: JSON.stringify(MULTIPLE_TEST_DATA.testWebsite),
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
  
  if (result.offeringsCount !== 2) {
    throw new Error(`Expected 2 offerings, got ${result.offeringsCount}`);
  }
}

async function multipleMain() {
  try {
    console.log('🧪 Multiple Offerings Test');
    console.log('========================');
    
    const sessionToken = await multipleLogin();
    await testCreateWebsiteWithMultipleOfferings(sessionToken);
    
    console.log('');
    console.log('🎉 All tests passed! Multiple offerings work correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  multipleMain();
}