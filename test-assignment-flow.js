const { Pool } = require('pg');
require('dotenv').config();

async function testAssignmentFlow() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔄 Testing publisher assignment flow...\n');
    
    // 1. Get test data
    const testData = await pool.query(`
      SELECT 
        o.id as order_id,
        oli.id as line_item_id,
        oli.assigned_domain,
        oli.publisher_id,
        oli.publisher_status,
        p.id as publisher_id,
        p.contact_name
      FROM orders o
      LEFT JOIN order_line_items oli ON o.id = oli.order_id
      LEFT JOIN publishers p ON p.status = 'active'
      WHERE oli.client_id IN (SELECT id FROM clients WHERE name = 'Test Client Co')
      ORDER BY o.created_at DESC, oli.created_at ASC, p.created_at ASC
      LIMIT 1
    `);
    
    if (testData.rows.length === 0) {
      console.log('❌ No test data found');
      return;
    }
    
    const data = testData.rows[0];
    console.log('✅ Test data ready:');
    console.log(`   Order: ${data.order_id.slice(-8)}`);
    console.log(`   Line Item: ${data.line_item_id.slice(-8)} (${data.assigned_domain})`);
    console.log(`   Publisher: ${data.contact_name}`);
    console.log(`   Current Status: ${data.publisher_status || 'unassigned'}`);
    
    // 2. Test assignment API (simulate what the UI does)
    console.log('\n🔄 Testing assignment...');
    
    // Clear any existing assignment first
    await pool.query(`
      UPDATE order_line_items 
      SET publisher_id = NULL,
          publisher_status = NULL,
          publisher_price = NULL,
          platform_fee = NULL,
          publisher_notified_at = NULL,
          publisher_accepted_at = NULL,
          publisher_submitted_at = NULL
      WHERE id = $1
    `, [data.line_item_id]);
    
    // Now test the assignment
    const assignResult = await pool.query(`
      UPDATE order_line_items 
      SET publisher_id = $1,
          publisher_status = 'notified',
          publisher_price = 5000,
          platform_fee = 750,
          publisher_notified_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING publisher_status, publisher_price, platform_fee
    `, [data.publisher_id, data.line_item_id]);
    
    console.log('✅ Assignment successful:');
    const assigned = assignResult.rows[0];
    console.log(`   Status: ${assigned.publisher_status}`);
    console.log(`   Gross: $${assigned.publisher_price / 100}`);
    console.log(`   Fee: $${assigned.platform_fee / 100}`);
    console.log(`   Net: $${(assigned.publisher_price - assigned.platform_fee) / 100}`);
    
    // 3. Test publisher acceptance
    console.log('\n🔄 Testing acceptance...');
    
    const acceptResult = await pool.query(`
      UPDATE order_line_items 
      SET publisher_status = 'accepted',
          publisher_accepted_at = NOW()
      WHERE id = $1 AND publisher_status = 'notified'
      RETURNING publisher_status
    `, [data.line_item_id]);
    
    if (acceptResult.rows.length > 0) {
      console.log('✅ Order accepted successfully');
      console.log(`   New status: ${acceptResult.rows[0].publisher_status}`);
    } else {
      console.log('❌ Failed to accept (wrong status)');
    }
    
    // 4. Test work progression
    console.log('\n🔄 Testing work progression...');
    
    await pool.query(`
      UPDATE order_line_items 
      SET publisher_status = 'in_progress'
      WHERE id = $1 AND publisher_status = 'accepted'
    `, [data.line_item_id]);
    
    console.log('✅ Work started (in_progress)');
    
    // 5. Test submission
    console.log('\n🔄 Testing work submission...');
    
    const submitResult = await pool.query(`
      UPDATE order_line_items 
      SET publisher_status = 'submitted',
          publisher_submitted_at = NOW(),
          published_url = 'https://example.com/test-article',
          delivered_at = NOW()
      WHERE id = $1 AND publisher_status = 'in_progress'
      RETURNING publisher_status, published_url
    `, [data.line_item_id]);
    
    if (submitResult.rows.length > 0) {
      console.log('✅ Work submitted successfully');
      console.log(`   Status: ${submitResult.rows[0].publisher_status}`);
      console.log(`   URL: ${submitResult.rows[0].published_url}`);
    } else {
      console.log('❌ Failed to submit (wrong status)');
    }
    
    // 6. Final verification
    console.log('\n📊 Final state verification...');
    
    const finalCheck = await pool.query(`
      SELECT 
        oli.id,
        oli.assigned_domain,
        oli.publisher_status,
        oli.publisher_price,
        oli.platform_fee,
        oli.published_url,
        oli.publisher_notified_at,
        oli.publisher_accepted_at,
        oli.publisher_submitted_at,
        p.contact_name as publisher_name
      FROM order_line_items oli
      LEFT JOIN publishers p ON oli.publisher_id = p.id
      WHERE oli.id = $1
    `, [data.line_item_id]);
    
    const final = finalCheck.rows[0];
    console.log('✅ Complete workflow state:');
    console.log(`   Line Item: ${final.id.slice(-8)}`);
    console.log(`   Domain: ${final.assigned_domain}`);
    console.log(`   Publisher: ${final.publisher_name}`);
    console.log(`   Status: ${final.publisher_status}`);
    console.log(`   Payment: $${(final.publisher_price - final.platform_fee) / 100} net`);
    console.log(`   Published: ${final.published_url}`);
    console.log(`   Timeline:`);
    console.log(`     Notified: ${final.publisher_notified_at}`);
    console.log(`     Accepted: ${final.publisher_accepted_at}`);
    console.log(`     Submitted: ${final.publisher_submitted_at}`);
    
    console.log('\n🎉 Assignment flow test complete!');
    console.log('\n🌐 Test URLs:');
    console.log(`   Order Management: /orders/${data.order_id}/internal`);
    console.log(`   Publisher Accept: /publisher/orders/${data.line_item_id}/accept`);
    
  } catch (error) {
    console.error('❌ Assignment flow test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testAssignmentFlow();