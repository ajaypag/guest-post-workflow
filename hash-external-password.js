const bcrypt = require('bcryptjs');

async function hashPassword() {
  const password = 'zKz2OQgCKN!4yZI4';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password hash for external user:', hash);
}

hashPassword();
