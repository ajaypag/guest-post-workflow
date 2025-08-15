async function getToken() {
  const response = await fetch('http://localhost:3003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ajay@outreachlabs.com',
      password: 'FA64!I$nrbCauS^d'
    })
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/auth-token=([^;]+)/);
    if (match) {
      console.log(match[1]);
    }
  }
}

getToken();
