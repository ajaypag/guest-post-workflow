#!/usr/bin/env npx tsx

/**
 * Test script for edge cases in multiple offerings
 */

const EDGE_CASE_BASE_URL = 'http://localhost:3005';

const EDGE_CASE_TEST_DATA = {
  email: 'test.publisher@example.com',
  password: 'TestPassword123!',
};

async function edgeCaseLogin(): Promise<string> {
  const response = await fetch(`${EDGE_CASE_BASE_URL}/api/auth/publisher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: EDGE_CASE_TEST_DATA.email,
      password: EDGE_CASE_TEST_DATA.password
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const setCookie = response.headers.get('set-cookie');
  const sessionMatch = setCookie?.match(/auth-token-publisher=([^;]+)/);
  if (!sessionMatch) {
    throw new Error('Could not extract session token');
  }

  return sessionMatch[1];
}

async function testEdgeCase(testName: string, payload: any, sessionToken: string, expectedStatus: number) {
  console.log(`\n🧪 Testing: ${testName}`);
  
  const response = await fetch(`${EDGE_CASE_BASE_URL}/api/publisher/websites/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth-token-publisher=${sessionToken}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`   Status: ${response.status} (expected: ${expectedStatus})`);
  
  if (response.status === expectedStatus) {
    console.log(`   ✅ PASS: Got expected status`);
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected ${expectedStatus}, got ${response.status}`);
    console.log(`   Response: ${responseText}`);
    return false;
  }
}

async function edgeCaseMain() {
  try {
    console.log('🧪 Edge Cases Test Suite');
    console.log('========================');
    
    const sessionToken = await edgeCaseLogin();
    console.log('✅ Login successful');
    
    let passCount = 0;
    let totalTests = 0;
    
    // Test 1: Empty offerings array
    totalTests++;
    if (await testEdgeCase(
      'Empty offerings array',
      {
        domain: 'empty-offerings.com',
        categories: ['Technology'],
        offerings: []
      },
      sessionToken,
      400 // Should fail validation
    )) passCount++;
    
    // Test 2: Missing required fields
    totalTests++;
    if (await testEdgeCase(
      'Missing domain',
      {
        categories: ['Technology'],
        offerings: [{ offeringType: 'guest_post', basePrice: 10000 }]
      },
      sessionToken,
      400 // Should fail validation
    )) passCount++;
    
    // Test 3: Invalid price
    totalTests++;
    if (await testEdgeCase(
      'Invalid negative price',
      {
        domain: 'invalid-price.com',
        categories: ['Technology'],
        offerings: [{ offeringType: 'guest_post', basePrice: -100 }]
      },
      sessionToken,
      400 // Should fail validation
    )) passCount++;
    
    // Test 4: Same offering type twice (should work)
    totalTests++;
    if (await testEdgeCase(
      'Same offering type twice (should be allowed)',
      {
        domain: 'same-type-twice.com',
        categories: ['Technology'],
        offerings: [
          { offeringType: 'guest_post', basePrice: 10000 },
          { offeringType: 'guest_post', basePrice: 15000 }
        ]
      },
      sessionToken,
      200 // Should succeed
    )) passCount++;
    
    // Test 5: Very large number of offerings
    totalTests++;
    const manyOfferings = Array.from({ length: 10 }, (_, i) => ({
      offeringType: i % 2 === 0 ? 'guest_post' : 'link_insertion',
      basePrice: 10000 + (i * 1000)
    }));
    
    if (await testEdgeCase(
      'Many offerings (10)',
      {
        domain: 'many-offerings.com',
        categories: ['Technology'],
        offerings: manyOfferings
      },
      sessionToken,
      200 // Should succeed
    )) passCount++;
    
    console.log(`\n📊 Test Results: ${passCount}/${totalTests} passed`);
    
    if (passCount === totalTests) {
      console.log('🎉 All edge case tests passed!');
    } else {
      console.log('❌ Some edge case tests failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  edgeCaseMain();
}