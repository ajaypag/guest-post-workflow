const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable'
});

async function checkMigrationState() {
  try {
    // Check migrations table
    const migrationResult = await pool.query(`
      SELECT name, applied_at 
      FROM migrations 
      WHERE name LIKE '%055%' OR name LIKE '%056%'
      ORDER BY applied_at DESC
    `);
    
    console.log('Migration records:');
    console.log(migrationResult.rows);
    
    // Check if line items exist
    const lineItemsResult = await pool.query(`
      SELECT COUNT(*) as count FROM order_line_items
    `);
    
    console.log('\nLine items count:', lineItemsResult.rows[0].count);
    
    // Check columns in order_line_items
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_line_items' 
      AND column_name IN ('modified_at', 'updated_at', 'assigned_at', 'service_fee')
      ORDER BY column_name
    `);
    
    console.log('\nColumns that exist:');
    columnsResult.rows.forEach(row => console.log('  -', row.column_name));
    
    // Check orders with groups
    const ordersResult = await pool.query(`
      SELECT 
        o.id,
        o.status,
        COUNT(DISTINCT og.id) as group_count,
        COUNT(DISTINCT li.id) as lineitem_count
      FROM orders o
      LEFT JOIN order_groups og ON og.order_id = o.id
      LEFT JOIN order_line_items li ON li.order_id = o.id
      GROUP BY o.id, o.status
      ORDER BY o.created_at DESC
    `);
    
    console.log('\nOrders with groups and line items:');
    ordersResult.rows.forEach(row => {
      console.log(`  Order ${row.id}: ${row.status} - ${row.group_count} groups, ${row.lineitem_count} line items`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMigrationState();