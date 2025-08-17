const { Pool } = require('pg');
require('dotenv').config();

async function testCompleteWorkflow() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔄 Testing complete publisher workflow...\n');
    
    // 1. Get our test order
    console.log('1. Finding test order with line items...');
    const orderResult = await pool.query(`
      SELECT o.id, o.status, COUNT(oli.id) as line_item_count
      FROM orders o
      LEFT JOIN order_line_items oli ON o.id = oli.order_id
      WHERE oli.client_id IN (SELECT id FROM clients WHERE name = 'Test Client Co')
      GROUP BY o.id, o.status
      ORDER BY o.created_at DESC
      LIMIT 1
    `);
    
    if (orderResult.rows.length === 0) {
      console.log('❌ No test orders found. Run create-test-data.js first');
      return;
    }
    
    const testOrder = orderResult.rows[0];
    console.log(`✅ Using test order: ${testOrder.id.slice(-8)} (${testOrder.line_item_count} items)`);
    
    // 2. Check for publishers
    console.log('\n2. Checking for active publishers...');
    const publishersResult = await pool.query(`
      SELECT id, contact_name, email, status 
      FROM publishers 
      WHERE status = 'active' 
      LIMIT 1
    `);
    
    if (publishersResult.rows.length === 0) {
      console.log('❌ No active publishers found. Creating test publisher...');
      
      // Create a test publisher
      const newPublisher = await pool.query(`
        INSERT INTO publishers (
          id, email, contact_name, company_name, status, 
          commission_rate, email_verified, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), 'test@publisher.com', 'Test Publisher', 
          'Test Publisher Co', 'active', 15.00, true, NOW(), NOW()
        )
        RETURNING id, contact_name, email
      `);
      
      console.log(`✅ Created test publisher: ${newPublisher.rows[0].contact_name}`);
      var publisher = newPublisher.rows[0];
    } else {
      var publisher = publishersResult.rows[0];
      console.log(`✅ Using existing publisher: ${publisher.contact_name}`);
    }
    
    // 3. Get an unassigned line item
    console.log('\n3. Finding unassigned line item...');
    const lineItemResult = await pool.query(`
      SELECT id, assigned_domain, anchor_text, target_page_url, publisher_id, publisher_status
      FROM order_line_items 
      WHERE order_id = $1 
      ORDER BY created_at 
      LIMIT 1
    `, [testOrder.id]);
    
    if (lineItemResult.rows.length === 0) {
      console.log('❌ No line items found');
      return;
    }
    
    const lineItem = lineItemResult.rows[0];
    console.log(`✅ Line item: ${lineItem.id.slice(-8)} - ${lineItem.assigned_domain}`);
    console.log(`   Current status: ${lineItem.publisher_status || 'unassigned'}`);
    
    // 4. Simulate assignment workflow
    console.log('\n4. Simulating publisher assignment...');
    
    const assignResult = await pool.query(`
      UPDATE order_line_items 
      SET publisher_id = $1,
          publisher_status = 'notified',
          publisher_price = 5000,
          platform_fee = 750,
          publisher_notified_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, publisher_status, publisher_price, platform_fee
    `, [publisher.id, lineItem.id]);
    
    console.log('✅ Assignment completed:');
    const assigned = assignResult.rows[0];
    console.log(`   Status: ${assigned.publisher_status}`);
    console.log(`   Price: $${assigned.publisher_price / 100}`);
    console.log(`   Platform Fee: $${assigned.platform_fee / 100}`);
    console.log(`   Net Earnings: $${(assigned.publisher_price - assigned.platform_fee) / 100}`);
    
    // 5. Simulate publisher acceptance
    console.log('\n5. Simulating publisher acceptance...');
    
    const acceptResult = await pool.query(`
      UPDATE order_line_items 
      SET publisher_status = 'accepted',
          publisher_accepted_at = NOW()
      WHERE id = $1
      RETURNING publisher_status, publisher_accepted_at
    `, [lineItem.id]);
    
    console.log('✅ Order accepted by publisher');
    console.log(`   New status: ${acceptResult.rows[0].publisher_status}`);
    console.log(`   Accepted at: ${acceptResult.rows[0].publisher_accepted_at}`);
    
    // 6. Simulate work progression
    console.log('\n6. Simulating work progression...');
    
    await pool.query(`
      UPDATE order_line_items 
      SET publisher_status = 'in_progress'
      WHERE id = $1
    `, [lineItem.id]);
    
    console.log('✅ Publisher started work (status: in_progress)');
    
    // 7. Simulate work completion
    console.log('\n7. Simulating work completion...');
    
    const submitResult = await pool.query(`
      UPDATE order_line_items 
      SET publisher_status = 'submitted',
          publisher_submitted_at = NOW(),
          published_url = 'https://example.com/published-article',
          delivered_at = NOW()
      WHERE id = $1
      RETURNING publisher_status, published_url, publisher_submitted_at
    `, [lineItem.id]);
    
    console.log('✅ Work submitted by publisher');
    console.log(`   Status: ${submitResult.rows[0].publisher_status}`);
    console.log(`   Published URL: ${submitResult.rows[0].published_url}`);
    console.log(`   Submitted at: ${submitResult.rows[0].publisher_submitted_at}`);
    
    // 8. Create earnings record
    console.log('\n8. Creating earnings record...');
    
    const earningsResult = await pool.query(`
      INSERT INTO publisher_earnings (
        id, publisher_id, order_line_item_id, order_id,
        gross_amount, platform_fee, net_amount, status,
        created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW()
      )
      RETURNING id, net_amount, status
    `, [
      publisher.id, 
      lineItem.id, 
      testOrder.id,
      assigned.publisher_price,
      assigned.platform_fee,
      assigned.publisher_price - assigned.platform_fee
    ]);
    
    console.log('✅ Earnings record created');
    console.log(`   Earnings ID: ${earningsResult.rows[0].id.slice(-8)}`);
    console.log(`   Amount: $${earningsResult.rows[0].net_amount / 100}`);
    console.log(`   Status: ${earningsResult.rows[0].status}`);
    
    // 9. Show final workflow state
    console.log('\n9. Final workflow state...');
    
    const finalState = await pool.query(`
      SELECT 
        oli.id as line_item_id,
        oli.assigned_domain,
        oli.publisher_status,
        oli.published_url,
        p.contact_name as publisher_name,
        pe.net_amount as earnings,
        pe.status as earnings_status
      FROM order_line_items oli
      LEFT JOIN publishers p ON oli.publisher_id = p.id
      LEFT JOIN publisher_earnings pe ON oli.id = pe.order_line_item_id
      WHERE oli.id = $1
    `, [lineItem.id]);
    
    const final = finalState.rows[0];
    console.log('✅ Workflow completed successfully!');
    console.log(`   Domain: ${final.assigned_domain}`);
    console.log(`   Publisher: ${final.publisher_name}`);
    console.log(`   Status: ${final.publisher_status}`);
    console.log(`   Published: ${final.published_url}`);
    console.log(`   Earnings: $${final.earnings / 100} (${final.earnings_status})`);
    
    // 10. URLs for testing
    console.log('\n🌐 URLs for manual testing:');
    console.log(`Order Management: /orders/${testOrder.id}/internal`);
    console.log(`Publisher Orders: /publisher/orders`);
    console.log(`Publisher Accept: /publisher/orders/${lineItem.id}/accept`);
    console.log(`Publisher Dashboard: /publisher`);
    
    console.log('\n🎉 Complete workflow test successful!');
    console.log('\n📋 Workflow Summary:');
    console.log('1. ✅ Order created with line items');
    console.log('2. ✅ Publisher assigned to line item');
    console.log('3. ✅ Publisher notified (status: notified)');
    console.log('4. ✅ Publisher accepted order');
    console.log('5. ✅ Publisher completed work');
    console.log('6. ✅ Work submitted with published URL');
    console.log('7. ✅ Earnings calculated and recorded');
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testCompleteWorkflow();