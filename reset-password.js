const bcrypt = require('bcryptjs');

async function resetPassword() {
  // Generate a simple password
  const newPassword = 'TestUser123!';
  
  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  
  console.log('New password:', newPassword);
  console.log('Hashed password:', hashedPassword);
  
  return { newPassword, hashedPassword };
}

resetPassword().catch(console.error);