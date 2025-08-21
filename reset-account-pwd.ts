import bcrypt from 'bcryptjs';
import { db } from './lib/db/connection';
import { accounts } from './lib/db/accountSchema';
import { eq } from 'drizzle-orm';

async function resetPassword() {
  const email = 'orders@outreachlabs.com';
  const newPassword = 'test123';
  
  console.log(`\n=== Resetting password for ${email} ===\n`);
  
  // Find the account
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.email, email)
  });
  
  if (!account) {
    console.log('Account not found!');
    process.exit(1);
  }
  
  console.log('Found account:');
  console.log('  ID:', account.id);
  console.log('  Name:', account.name);
  console.log('  Company:', account.companyName);
  console.log('  Status:', account.status);
  
  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update the password
  await db
    .update(accounts)
    .set({ 
      passwordHash: hashedPassword,
      updatedAt: new Date()
    })
    .where(eq(accounts.id, account.id));
  
  console.log('\n✅ Password reset successfully!');
  console.log('New password:', newPassword);
  console.log('Login at: http://localhost:3001/account/login');
  
  process.exit(0);
}

resetPassword().catch(console.error);