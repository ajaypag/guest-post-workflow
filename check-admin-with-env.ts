import 'dotenv/config';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('DATABASE_URL configured:', !!process.env.DATABASE_URL);

import { db } from './lib/db/connection';
import { users } from './lib/db/schema';

async function checkAdmin() {
  try {
    const allUsers = await db.select().from(users);
    console.log('\nAll users in database:');
    allUsers.forEach(user => {
      console.log(`- Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
    });
    
    const adminUsers = allUsers.filter(u => u.role === 'admin');
    console.log(`\nFound ${adminUsers.length} admin users`);
    
    if (adminUsers.length > 0) {
      console.log('\nAdmin users:');
      adminUsers.forEach(admin => {
        console.log(`  - ${admin.email}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdmin();