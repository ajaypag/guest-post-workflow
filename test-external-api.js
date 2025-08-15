async function testExternalLogin() {
  try {
    const response = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'abelino@factbites.com',
        password: 'zKz2OQgCKN!4yZI4'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ External user login successful!');
      console.log('User data:', data.user);
      console.log('User type:', data.user.userType);
      console.log('Role:', data.user.role);
    } else {
      console.log('❌ Login failed:', response.status);
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testExternalLogin();
