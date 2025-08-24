// Script to check existing users and create test users if needed
const { UserService } = require('./lib/db/userService.ts');

async function checkAndCreateUsers() {
  try {
    console.log('🔍 Checking existing users...');
    
    // Get all users
    const allUsers = await UserService.getAllUsers();
    console.log(`Found ${allUsers.length} existing users:`);
    
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Active: ${user.isActive}`);
    });
    
    // Initialize admin if no users exist
    if (allUsers.length === 0) {
      console.log('\n📝 No users found. Initializing admin user...');
      await UserService.initializeAdmin();
      console.log('✅ Admin user created: admin@example.com / admin123');
    }
    
    // Check if ajay@outreachlabs.com exists
    const ajayUser = await UserService.getUserByEmail('ajay@outreachlabs.com');
    if (!ajayUser) {
      console.log('\n📝 Creating ajay@outreachlabs.com user...');
      try {
        await UserService.createUser({
          email: 'ajay@outreachlabs.com',
          name: 'Ajay Test User',
          password: 'password123',
          role: 'admin',
          isActive: true,
        });
        console.log('✅ Test user created: ajay@outreachlabs.com / password123');
      } catch (error) {
        console.error('❌ Failed to create test user:', error.message);
      }
    } else {
      console.log('\n✅ ajay@outreachlabs.com already exists');
    }
    
    // Final user list
    console.log('\n📋 Final user list:');
    const finalUsers = await UserService.getAllUsers();
    finalUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Active: ${user.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAndCreateUsers();