async function testLogin() {
  try {
    const response = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'ajay@outreachlabs.com',
        password: 'FA64!I$nrbCauS^d'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('User:', data.user);
      
      // Get cookie from response
      const setCookie = response.headers.get('set-cookie');
      console.log('Cookie set:', setCookie ? 'Yes' : 'No');
      
      if (setCookie) {
        // Extract token from cookie
        const tokenMatch = setCookie.match(/auth-token=([^;]+)/);
        if (tokenMatch) {
          console.log('Token (first 20 chars):', tokenMatch[1].substring(0, 20) + '...');
        }
      }
    } else {
      console.log('❌ Login failed:', response.status);
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testLogin();
