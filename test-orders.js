const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable'
});

async function checkOrders() {
  try {
    // Check orders and groups
    const result = await pool.query(`
      SELECT 
        o.id as order_id,
        o.status as order_status,
        og.id as group_id,
        og.client_id,
        og.link_count,
        og.target_pages,
        og.anchor_texts,
        og.bulk_analysis_project_id
      FROM orders o
      LEFT JOIN order_groups og ON og.order_id = o.id
      ORDER BY o.id
    `);
    
    console.log('Orders and groups:');
    result.rows.forEach(row => {
      console.log(`Order ${row.order_id} (${row.order_status}): Group ${row.group_id || 'NONE'}, Client ${row.client_id || 'NONE'}, Links: ${row.link_count || 0}`);
      if (row.target_pages) {
        console.log('  Target pages:', JSON.stringify(row.target_pages).substring(0, 100));
      }
    });
    
    // Count totals
    const countResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT og.id) as group_count,
        COUNT(DISTINCT li.id) as lineitem_count
      FROM orders o
      LEFT JOIN order_groups og ON og.order_id = o.id
      LEFT JOIN order_line_items li ON li.order_id = o.id
    `);
    
    console.log('\nTotals:');
    console.log('  Orders:', countResult.rows[0].order_count);
    console.log('  Groups:', countResult.rows[0].group_count);
    console.log('  Line Items:', countResult.rows[0].lineitem_count);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkOrders();