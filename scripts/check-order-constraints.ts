import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';

async function checkOrderConstraints() {
  console.log('Checking orders table constraints...\n');

  try {
    // Check all foreign key constraints on orders table
    const constraints = await db.execute(sql`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'orders'
        AND tc.table_schema = 'public'
      ORDER BY tc.constraint_name;
    `);

    console.log('Foreign Key Constraints on orders table:');
    console.log('=========================================');
    
    for (const constraint of constraints) {
      console.log(`\nConstraint: ${constraint.constraint_name}`);
      console.log(`  Column: ${constraint.column_name}`);
      console.log(`  References: ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    }

    // Check if system user exists
    console.log('\n\nChecking system user...');
    const systemUser = await db.execute(sql`
      SELECT id, email, name FROM users 
      WHERE id = '00000000-0000-0000-0000-000000000000'
    `);

    if (systemUser.length > 0) {
      console.log('✓ System user exists:', systemUser[0]);
    } else {
      console.log('✗ System user NOT found!');
    }

    // Check accounts table
    console.log('\n\nChecking accounts table...');
    const accountCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM accounts
    `);
    console.log(`Total accounts: ${accountCount[0].count}`);

    // Check if there are any orders with account_id
    console.log('\n\nChecking orders with account_id...');
    const ordersWithAccount = await db.execute(sql`
      SELECT COUNT(*) as count FROM orders WHERE account_id IS NOT NULL
    `);
    console.log(`Orders with account_id: ${ordersWithAccount[0].count}`);

  } catch (error) {
    console.error('Error checking constraints:', error);
  } finally {
    process.exit(0);
  }
}

checkOrderConstraints();