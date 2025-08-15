const bcrypt = require('bcryptjs');

async function hashPassword() {
  const password = 'FA64!I$nrbCauS^d';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password hash:', hash);
  
  // Test it
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash validates:', isValid);
}

hashPassword();
