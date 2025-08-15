async function getExternalToken() {
  const response = await fetch('http://localhost:3003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'abelino@factbites.com',
      password: 'zKz2OQgCKN!4yZI4'
    })
  });

  console.log('Response status:', response.status);
  const setCookie = response.headers.get('set-cookie');
  console.log('Set-Cookie header:', setCookie);
  
  if (setCookie) {
    const match = setCookie.match(/auth-token=([^;]+)/);
    if (match) {
      console.log('Token found:', match[1].substring(0, 50) + '...');
    } else {
      console.log('No auth-token found in cookie');
    }
  }
  
  const data = await response.json();
  console.log('User data:', data.user);
}

getExternalToken();
