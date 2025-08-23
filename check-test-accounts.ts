import { db } from './lib/db/connection';
import { users } from './lib/db/schema';

async function checkTestAccounts() {
  console.log('🔍 Available test accounts:');
  
  const testUsers = await db
    .select({
      email: users.email,
      name: users.name,
      role: users.role,
      userType: users.userType,
    })
    .from(users)
    .limit(10);
  
  testUsers.forEach(user => {
    console.log(`  📧 ${user.email} | ${user.name} | ${user.role} | ${user.userType}`);
  });
  
  console.log('\n💡 Try logging in with any of these accounts.');
  console.log('Password should be "password123" for most test accounts.');
  
  process.exit(0);
}

checkTestAccounts();