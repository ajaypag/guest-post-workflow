const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5434,
  database: 'guest_post_workflow',
  user: 'postgres',
  password: 'postgres',
});

async function testMigrationQueries() {
  console.log('🧪 Testing Migration Queries Directly on Database\n');
  
  const client = await pool.connect();
  
  try {
    // Test 1: Check if order_line_items table exists and has modified_at column
    console.log('1. Testing order_line_items table and modified_at column...');
    const columnCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'order_line_items' 
      AND column_name = 'modified_at'
    `);
    console.log('   ✅ modified_at column exists:', columnCheck.rows.length > 0);
    
    // Test 2: Try the problematic query
    console.log('\n2. Testing the problematic modified_at query...');
    try {
      const result = await client.query(`
        SELECT modified_at 
        FROM order_line_items 
        ORDER BY modified_at DESC 
        LIMIT 1
      `);
      console.log('   ✅ Query successful, rows returned:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('   Latest modified_at:', result.rows[0].modified_at);
      }
    } catch (error) {
      console.log('   ❌ Query failed:', error.message);
    }
    
    // Test 3: Count existing data for migration
    console.log('\n3. Checking migration candidate data...');
    
    // Count total orders
    const ordersResult = await client.query('SELECT COUNT(*) as count FROM orders');
    console.log('   Total orders:', ordersResult.rows[0].count);
    
    // Count orders with order_groups (candidates for migration)
    const groupsResult = await client.query(`
      SELECT COUNT(DISTINCT order_id) as count 
      FROM order_groups
    `);
    console.log('   Orders with groups (migration candidates):', groupsResult.rows[0].count);
    
    // Count orders with line_items (already migrated)
    const lineItemsResult = await client.query(`
      SELECT COUNT(DISTINCT order_id) as count 
      FROM order_line_items
    `);
    console.log('   Orders with line items (already migrated):', lineItemsResult.rows[0].count);
    
    // Test 4: Sample migration logic
    console.log('\n4. Testing sample migration logic...');
    const sampleOrder = await client.query(`
      SELECT o.id as order_id, og.id as group_id, og.client_id, og.link_count
      FROM orders o
      INNER JOIN order_groups og ON og.order_id = o.id
      LEFT JOIN order_line_items oli ON oli.order_id = o.id
      WHERE oli.id IS NULL
      LIMIT 1
    `);
    
    if (sampleOrder.rows.length > 0) {
      console.log('   ✅ Found migration candidate order:', sampleOrder.rows[0].order_id.slice(0, 8));
      console.log('   - Group ID:', sampleOrder.rows[0].group_id.slice(0, 8));
      console.log('   - Client ID:', sampleOrder.rows[0].client_id.slice(0, 8));
      console.log('   - Link count:', sampleOrder.rows[0].link_count);
    } else {
      console.log('   ℹ️  No orders need migration (all already have line items)');
    }
    
  } finally {
    client.release();
    await pool.end();
  }
  
  console.log('\n🎉 Migration database test complete!');
}

testMigrationQueries().catch(console.error);