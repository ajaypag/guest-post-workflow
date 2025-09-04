import { sql } from '../lib/db';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  const email = 'info@electricalgoodsstore.com';
  const newPassword = 'password123';
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password in the accounts table
    const result = await sql`
      UPDATE accounts 
      SET password_hash = ${hashedPassword}
      WHERE email = ${email}
      RETURNING id, email, name
    `;
    
    if (result.length > 0) {
      console.log('✅ Password reset successfully for:', result[0].email);
      console.log('   Name:', result[0].name);
      console.log('   New password: password123');
    } else {
      console.log('❌ No account found with email:', email);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    process.exit(0);
  }
}

resetPassword();
