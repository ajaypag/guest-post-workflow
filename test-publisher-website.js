// Test script for publisher website functionality

async function testPublisherWebsiteFlow() {
  const baseUrl = 'http://localhost:3001';
  
  // First, we need to get a publisher session
  // For testing, let's check if we have any publishers in the database
  console.log('Testing Publisher Website Flow...\n');
  
  // Test 1: Search for an existing website
  console.log('Test 1: Searching for existing website (nikolaroza.com)');
  try {
    const searchResponse = await fetch(`${baseUrl}/api/publisher/websites/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // We'll need to add authentication cookie here
      },
      body: JSON.stringify({ domain: 'nikolaroza.com' })
    });
    
    const searchData = await searchResponse.json();
    console.log('Search Response:', searchResponse.status);
    console.log('Search Data:', JSON.stringify(searchData, null, 2));
  } catch (error) {
    console.error('Search failed:', error.message);
  }
  
  // Test 2: Search for a non-existent website
  console.log('\nTest 2: Searching for non-existent website (mynewtestsite.com)');
  try {
    const searchResponse = await fetch(`${baseUrl}/api/publisher/websites/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: 'mynewtestsite.com' })
    });
    
    const searchData = await searchResponse.json();
    console.log('Search Response:', searchResponse.status);
    console.log('Search Data:', JSON.stringify(searchData, null, 2));
  } catch (error) {
    console.error('Search failed:', error.message);
  }
  
  // Test 3: Try to add a new website (will fail without auth)
  console.log('\nTest 3: Attempting to add new website (should fail without auth)');
  try {
    const addResponse = await fetch(`${baseUrl}/api/publisher/websites/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'mynewtestsite.com',
        domainRating: 45,
        totalTraffic: 50000,
        guestPostCost: '200',
        websiteType: 'blog',
        turnaroundDays: 7,
        acceptsDoFollow: true,
        requiresAuthorBio: false,
        maxLinksPerPost: 2
      })
    });
    
    const addData = await addResponse.json();
    console.log('Add Response:', addResponse.status);
    console.log('Add Data:', JSON.stringify(addData, null, 2));
  } catch (error) {
    console.error('Add failed:', error.message);
  }
}

testPublisherWebsiteFlow().then(() => {
  console.log('\nTests completed!');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});