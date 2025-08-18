const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable'
});

async function createTestData() {
  try {
    console.log('Creating test data to simulate production environment...\n');
    
    // Create test clients
    const client1Id = uuidv4();
    const client2Id = uuidv4();
    const client3Id = uuidv4();
    
    await pool.query(`
      INSERT INTO clients (id, name, website, created_by, created_at, updated_at)
      SELECT $1, 'Test Client 1', 'https://example1.com', '97aca16f-8b81-44ad-a532-a6e3fa96cbfc', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = $1)
    `, [client1Id]);
    
    await pool.query(`
      INSERT INTO clients (id, name, website, created_by, created_at, updated_at)
      SELECT $1, 'Test Client 2', 'https://example2.com', '97aca16f-8b81-44ad-a532-a6e3fa96cbfc', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = $1)
    `, [client2Id]);
    
    await pool.query(`
      INSERT INTO clients (id, name, website, created_by, created_at, updated_at)
      SELECT $1, 'Test Client 3', 'https://example3.com', '97aca16f-8b81-44ad-a532-a6e3fa96cbfc', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = $1)
    `, [client3Id]);
    
    console.log('✅ Created 3 test clients');
    
    // Create test orders
    const order1Id = uuidv4();
    const order2Id = uuidv4();
    const order3Id = uuidv4();
    
    await pool.query(`
      INSERT INTO orders (id, status, created_by, created_at, updated_at, state)
      SELECT $1, 'pending', '97aca16f-8b81-44ad-a532-a6e3fa96cbfc', NOW(), NOW(), 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = $1)
    `, [order1Id]);
    
    await pool.query(`
      INSERT INTO orders (id, status, created_by, created_at, updated_at, state)
      SELECT $1, 'pending', '97aca16f-8b81-44ad-a532-a6e3fa96cbfc', NOW(), NOW(), 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = $1)
    `, [order2Id]);
    
    await pool.query(`
      INSERT INTO orders (id, status, created_by, created_at, updated_at, state)
      SELECT $1, 'pending', '97aca16f-8b81-44ad-a532-a6e3fa96cbfc', NOW(), NOW(), 'pending'
      WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = $1)
    `, [order3Id]);
    
    console.log('✅ Created 3 test orders');
    
    // Create test domains for bulk_analysis_domains
    const domain1Id = uuidv4();
    const domain2Id = uuidv4();
    const domain3Id = uuidv4();
    
    await pool.query(`
      INSERT INTO bulk_analysis_domains (id, domain, created_at, updated_at)
      SELECT $1, 'testsite1.com', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM bulk_analysis_domains WHERE id = $1)
    `, [domain1Id]);
    
    await pool.query(`
      INSERT INTO bulk_analysis_domains (id, domain, created_at, updated_at)
      SELECT $1, 'testsite2.com', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM bulk_analysis_domains WHERE id = $1)
    `, [domain2Id]);
    
    await pool.query(`
      INSERT INTO bulk_analysis_domains (id, domain, created_at, updated_at)
      SELECT $1, 'testsite3.com', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM bulk_analysis_domains WHERE id = $1)
    `, [domain3Id]);
    
    console.log('✅ Created 3 test domains');
    
    // Create order groups (12 total, distributed among 3 orders)
    const groupIds = [];
    let groupCount = 0;
    
    // Order 1: 5 groups
    for (let i = 0; i < 5; i++) {
      const groupId = uuidv4();
      groupIds.push(groupId);
      await pool.query(`
        INSERT INTO order_groups (
          id, order_id, client_id, link_count, 
          target_pages, anchor_texts, 
          created_at, updated_at
        ) 
        SELECT $1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM order_groups WHERE id = $1)
      `, [
        groupId, 
        order1Id, 
        client1Id, 
        2, // 2 links per group
        JSON.stringify([
          { url: `https://example1.com/page${i+1}` },
          { url: `https://example1.com/page${i+1}-alt` }
        ]),
        JSON.stringify([`anchor text ${i+1}`, `anchor text ${i+1} alt`])
      ]);
      groupCount++;
    }
    
    // Order 2: 4 groups  
    for (let i = 0; i < 4; i++) {
      const groupId = uuidv4();
      groupIds.push(groupId);
      await pool.query(`
        INSERT INTO order_groups (
          id, order_id, client_id, link_count,
          target_pages, anchor_texts,
          created_at, updated_at
        )
        SELECT $1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM order_groups WHERE id = $1)
      `, [
        groupId,
        order2Id,
        client2Id,
        1, // 1 link per group
        JSON.stringify([{ url: `https://example2.com/page${i+1}` }]),
        JSON.stringify([`anchor text ${i+1}`])
      ]);
      groupCount++;
    }
    
    // Order 3: 3 groups
    for (let i = 0; i < 3; i++) {
      const groupId = uuidv4();
      groupIds.push(groupId);
      await pool.query(`
        INSERT INTO order_groups (
          id, order_id, client_id, link_count,
          target_pages, anchor_texts,
          created_at, updated_at
        )
        SELECT $1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM order_groups WHERE id = $1)
      `, [
        groupId,
        order3Id,
        client3Id,
        3, // 3 links per group
        JSON.stringify([
          { url: `https://example3.com/page${i+1}` },
          { url: `https://example3.com/page${i+1}-b` },
          { url: `https://example3.com/page${i+1}-c` }
        ]),
        JSON.stringify([`anchor ${i+1}`, `anchor ${i+1}b`, `anchor ${i+1}c`])
      ]);
      groupCount++;
    }
    
    console.log(`✅ Created ${groupCount} order groups`);
    
    // Create some order_site_selections (optional, to test that join)
    for (let i = 0; i < 3; i++) {
      const selectionId = uuidv4();
      await pool.query(`
        INSERT INTO order_site_selections (
          id, order_group_id, domain_id, status,
          retail_price, wholesale_price,
          created_at, updated_at
        )
        SELECT $1, $2, $3, 'approved', 49900, 42000, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM order_site_selections WHERE id = $1)
      `, [selectionId, groupIds[i], domain1Id]);
    }
    
    console.log('✅ Created test site selections');
    
    // Clear any existing line items to start fresh
    await pool.query('DELETE FROM order_line_items');
    console.log('✅ Cleared existing line items');
    
    // Clear migration record so we can run it fresh
    await pool.query(`DELETE FROM migrations WHERE name = '0056_production_lineitems_migration'`);
    console.log('✅ Cleared migration record');
    
    // Verify the data
    const orderCount = await pool.query('SELECT COUNT(*) FROM orders');
    const groupCount2 = await pool.query('SELECT COUNT(*) FROM order_groups');
    const lineItemCount = await pool.query('SELECT COUNT(*) FROM order_line_items');
    
    console.log('\n📊 Database state:');
    console.log(`  - Orders: ${orderCount.rows[0].count}`);
    console.log(`  - Order Groups: ${groupCount2.rows[0].count}`);
    console.log(`  - Line Items: ${lineItemCount.rows[0].count} (should be 0 before migration)`);
    
    console.log('\n✅ Test data created successfully!');
    console.log('Now you can run the migration to convert these order groups to line items.');
    
  } catch (error) {
    console.error('Error creating test data:', error.message);
  } finally {
    await pool.end();
  }
}

createTestData();
