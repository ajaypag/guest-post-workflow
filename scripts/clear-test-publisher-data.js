const TEST_EMAIL = 'test-publisher@example.com';
const BASE_URL = 'http://localhost:3002';

async function findAndClearPublisher() {
  console.log('🔍 Finding test publisher...');
  
  // Create a test API to find publisher by email
  const findResponse = await fetch(`${BASE_URL}/api/test/find-publisher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL })
  });
  
  if (!findResponse.ok) {
    console.error('❌ Failed to find publisher:', await findResponse.text());
    return;
  }
  
  const { publisherId } = await findResponse.json();
  if (!publisherId) {
    console.log('❌ No publisher found with email:', TEST_EMAIL);
    return;
  }
  
  console.log('✅ Found publisher:', publisherId);
  
  // Clear all data
  console.log('🧹 Clearing publisher data...');
  
  const clearResponse = await fetch(`${BASE_URL}/api/test/reset-publisher-claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publisherId })
  });
  
  if (clearResponse.ok) {
    const result = await clearResponse.json();
    console.log('✅ Publisher reset to shadow status');
    console.log('🔗 New claim URL:', result.claimUrl);
    return result;
  } else {
    console.error('❌ Failed to clear publisher:', await clearResponse.text());
    return null;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting comprehensive publisher portal test...\n');
  
  // Step 1: Clear existing data
  const resetResult = await findAndClearPublisher();
  if (!resetResult) {
    console.error('❌ Cannot proceed without clearing data');
    return;
  }
  
  console.log('\n✅ Data cleared successfully');
  console.log('🔗 Claim URL:', resetResult.claimUrl);
  console.log('\n📋 Next steps:');
  console.log('1. Visit the claim URL to complete onboarding');
  console.log('2. Add websites and offerings through the UI');
  console.log('3. Test all 13 audit items systematically');
  console.log('\nAfter completing onboarding, run the validation tests.');
}

runComprehensiveTest();