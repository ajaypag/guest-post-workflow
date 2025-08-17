const { Pool } = require('pg');
require('dotenv').config();

async function createTestData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔄 Creating test data for publisher assignment...\n');
    
    // 1. Check if we have the necessary base data
    console.log('1. Checking for existing data...');
    
    // Check for users (needed for order creation)
    const usersResult = await pool.query(`
      SELECT id, name, email FROM users WHERE user_type = 'internal' LIMIT 1
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No internal users found');
      return;
    }
    
    const internalUser = usersResult.rows[0];
    console.log(`✅ Using internal user: ${internalUser.name}`);
    
    // Check for accounts
    const accountsResult = await pool.query(`
      SELECT id, company_name FROM accounts LIMIT 1
    `);
    
    if (accountsResult.rows.length === 0) {
      console.log('❌ No accounts found');
      return;
    }
    
    const account = accountsResult.rows[0];
    console.log(`✅ Using account: ${account.company_name}`);
    
    // 2. Create a test client if needed
    console.log('\n2. Creating test client...');
    const clientResult = await pool.query(`
      INSERT INTO clients (id, name, website, created_by, created_at)
      VALUES (gen_random_uuid(), 'Test Client Co', 'testclient.com', $1, NOW())
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `, [internalUser.id]);
    
    // If no rows returned, get existing client
    let client;
    if (clientResult.rows.length === 0) {
      const existingResult = await pool.query(`
        SELECT id, name FROM clients WHERE name = 'Test Client Co' LIMIT 1
      `);
      client = existingResult.rows[0];
    } else {
      client = clientResult.rows[0];
    }
    
    console.log(`✅ Test client ready: ${client.name}`);
    
    // 3. Create a test order
    console.log('\n3. Creating test order...');
    const orderResult = await pool.query(`
      INSERT INTO orders (id, account_id, status, total_retail, estimated_links_count, created_by, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, 'confirmed', 50000, 3, $2, NOW(), NOW())
      RETURNING id
    `, [account.id, internalUser.id]);
    
    const order = orderResult.rows[0];
    console.log(`✅ Test order created: ${order.id.slice(-8)}`);
    
    // 4. Create test line items
    console.log('\n4. Creating test line items...');
    const lineItems = [
      {
        domain: 'example.com',
        targetUrl: 'https://example.com/blog/article-1',
        anchorText: 'best software solutions',
        price: 5000
      },
      {
        domain: 'testblog.net',
        targetUrl: 'https://testblog.net/reviews/product-review',
        anchorText: 'top rated products',
        price: 7500
      },
      {
        domain: 'marketing-hub.org',
        targetUrl: 'https://marketing-hub.org/guides/seo-tips',
        anchorText: 'SEO optimization',
        price: 6000
      }
    ];
    
    for (const item of lineItems) {
      await pool.query(`
        INSERT INTO order_line_items (
          id, order_id, client_id, target_page_url, anchor_text, 
          assigned_domain, estimated_price, status,
          added_by_user_id, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'approved', 
          $7, NOW(), NOW()
        )
      `, [order.id, client.id, item.targetUrl, item.anchorText, item.domain, item.price, internalUser.id]);
    }
    
    console.log(`✅ Created ${lineItems.length} test line items`);
    
    // 5. Verify the test data
    console.log('\n5. Verifying test data...');
    const verifyResult = await pool.query(`
      SELECT oli.id, oli.assigned_domain, oli.anchor_text, oli.estimated_price,
             c.name as client_name, oli.publisher_id
      FROM order_line_items oli
      LEFT JOIN clients c ON oli.client_id = c.id
      WHERE oli.order_id = $1
      ORDER BY oli.created_at
    `, [order.id]);
    
    console.log('✅ Test line items created:');
    verifyResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.assigned_domain} - "${row.anchor_text}" ($${row.estimated_price / 100})`);
      console.log(`     Publisher: ${row.publisher_id ? 'Assigned' : 'Not assigned'}`);
    });
    
    console.log('\n🎉 Test data creation completed!');
    console.log(`\n📋 Created:`);
    console.log(`- Order ID: ${order.id}`);
    console.log(`- Client: ${client.name}`);
    console.log(`- Line Items: ${lineItems.length}`);
    console.log(`\n💡 You can now test publisher assignment at:`);
    console.log(`   /orders/${order.id}/internal`);
    
  } catch (error) {
    console.error('❌ Failed to create test data:', error.message);
  } finally {
    await pool.end();
  }
}

createTestData();