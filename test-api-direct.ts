async function testAPIDirectly() {
  // First login to get auth token
  const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'zaid@ppcmasterminds.com',
      password: 'password123'
    })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  console.log('Login response:', loginResponse.status);
  
  if (!setCookieHeader) {
    console.log('No auth cookie in response');
    return;
  }
  
  // Extract auth token from cookie
  const authToken = setCookieHeader.match(/auth-token=([^;]+)/)?.[1];
  if (!authToken) {
    console.log('Could not extract auth token');
    return;
  }
  
  console.log('Got auth token');
  
  // Now test the vetted sites API
  const apiResponse = await fetch('http://localhost:3004/api/vetted-sites', {
    headers: {
      'Cookie': `auth-token=${authToken}`
    }
  });
  
  console.log('API response status:', apiResponse.status);
  
  if (apiResponse.ok) {
    const data = await apiResponse.json();
    console.log('\n=== API RESPONSE ===');
    console.log('Total domains:', data.total);
    console.log('Domains returned:', data.domains?.length);
    console.log('Current page:', data.page);
    console.log('Total pages:', data.totalPages);
    console.log('Limit per page:', data.limit);
    console.log('\nStats:', data.stats);
    
    if (data.totalPages <= 1) {
      console.log('\n❌ ISSUE FOUND: Only 1 page, pagination won\'t show!');
      console.log('Need more than', data.limit, 'domains for pagination to appear');
    } else {
      console.log('\n✅ Multiple pages available, pagination should show');
    }
  } else {
    const error = await apiResponse.text();
    console.log('API error:', error);
  }
}

testAPIDirectly().catch(console.error);