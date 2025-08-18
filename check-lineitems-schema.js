const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5434,
  database: 'guest_post_workflow',
  user: 'postgres',
  password: 'postgres',
});

async function checkSchema() {
  try {
    const client = await pool.connect();
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'order_line_items'
      );
    `);
    console.log('Table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get column list
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nColumns in order_line_items:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check specifically for added_by column
      const hasAddedBy = columns.rows.some(col => col.column_name === 'added_by');
      console.log('\nHas added_by column:', hasAddedBy);
      
      if (!hasAddedBy) {
        console.log('\n⚠️  MISSING added_by column! Need to run migration.');
      }
    }
    
    client.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();