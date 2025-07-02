import { testConnection } from './connection';
import { UserService } from './userService';

export async function initializeDatabase() {
  console.log('🗄️ Initializing database...');
  
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    
    // Initialize admin user
    await UserService.initializeAdmin();
    
    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}