const { db } = require('./lib/db/connection');
const { users } = require('./lib/db/schema');

async function checkAdmin() {
  try {
    const allUsers = await db.select().from(users);
    console.log('All users in database:');
    allUsers.forEach(user => {
      console.log(`- Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
    });
    
    const adminUsers = allUsers.filter(u => u.role === 'admin');
    console.log(`\nFound ${adminUsers.length} admin users`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdmin();