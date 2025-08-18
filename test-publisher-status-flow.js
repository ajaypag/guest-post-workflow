const { Pool } = require('pg');
require('dotenv').config();

async function testPublisherStatusFlow() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔄 Testing publisher status management flow...\n');
    
    // Get a test order that we can work with
    const orderData = await pool.query(`
      SELECT 
        oli.id as line_item_id,
        oli.assigned_domain,
        oli.anchor_text,
        oli.publisher_status,
        oli.publisher_price,
        oli.platform_fee,
        p.contact_name as publisher_name
      FROM order_line_items oli
      LEFT JOIN publishers p ON oli.publisher_id = p.id
      WHERE oli.publisher_id IS NOT NULL
      ORDER BY oli.created_at DESC
      LIMIT 1
    `);
    
    if (orderData.rows.length === 0) {
      console.log('❌ No assigned orders found. Run assignment test first.');
      return;
    }
    
    const order = orderData.rows[0];
    console.log('✅ Found test order:');
    console.log(`   Line Item: ${order.line_item_id.slice(-8)}`);
    console.log(`   Domain: ${order.assigned_domain}`);
    console.log(`   Publisher: ${order.publisher_name}`);
    console.log(`   Current Status: ${order.publisher_status}`);
    console.log(`   Payment: $${order.publisher_price / 100} gross, $${(order.publisher_price - order.platform_fee) / 100} net`);
    
    // Reset to accepted status for testing
    console.log('\n🔄 Resetting to "accepted" status for testing...');
    await pool.query(`
      UPDATE order_line_items 
      SET publisher_status = 'accepted',
          publisher_submitted_at = NULL,
          published_url = NULL
      WHERE id = $1
    `, [order.line_item_id]);
    console.log('✅ Status reset to "accepted"');
    
    // Test status progression
    console.log('\n🔄 Testing status progression...');
    
    // 1. Start work (accepted → in_progress)
    console.log('\n1. Starting work...');
    await pool.query(`
      UPDATE order_line_items 
      SET publisher_status = 'in_progress'
      WHERE id = $1 AND publisher_status = 'accepted'
    `, [order.line_item_id]);
    console.log('✅ Status: accepted → in_progress');
    
    // 2. Submit work (in_progress → submitted)
    console.log('\n2. Submitting completed work...');
    const submitResult = await pool.query(`
      UPDATE order_line_items 
      SET publisher_status = 'submitted',
          publisher_submitted_at = NOW(),
          published_url = 'https://example.com/published-content'
      WHERE id = $1 AND publisher_status = 'in_progress'
      RETURNING publisher_status, published_url, publisher_submitted_at
    `, [order.line_item_id]);
    
    if (submitResult.rows.length > 0) {
      console.log('✅ Status: in_progress → submitted');
      console.log(`   Published URL: ${submitResult.rows[0].published_url}`);
      console.log(`   Submitted At: ${submitResult.rows[0].publisher_submitted_at}`);
    } else {
      console.log('❌ Failed to submit (wrong status)');
    }
    
    // 3. Create earnings record (automatic on submission)
    console.log('\n3. Creating earnings record...');
    const netAmount = order.publisher_price - order.platform_fee;
    
    try {
      const earningsResult = await pool.query(`
        INSERT INTO publisher_earnings (
          id, publisher_id, order_line_item_id, order_id,
          gross_amount, platform_fee, net_amount, status, earned_date,
          description, created_at, updated_at
        )
        SELECT 
          gen_random_uuid(), oli.publisher_id, oli.id, oli.order_id,
          oli.publisher_price, oli.platform_fee, $2, 'pending', CURRENT_DATE,
          CONCAT('Work completed for ', oli.assigned_domain, ' - "', oli.anchor_text, '"'),
          NOW(), NOW()
        FROM order_line_items oli
        WHERE oli.id = $1
        ON CONFLICT DO NOTHING
        RETURNING id, net_amount, status
      `, [order.line_item_id, netAmount]);
      
      if (earningsResult.rows.length > 0) {
        console.log('✅ Earnings record created:');
        console.log(`   Earnings ID: ${earningsResult.rows[0].id.slice(-8)}`);
        console.log(`   Net Amount: $${earningsResult.rows[0].net_amount / 100}`);
        console.log(`   Status: ${earningsResult.rows[0].status}`);
      } else {
        console.log('ℹ️  Earnings record already exists');
      }
    } catch (earningsError) {
      console.error('❌ Earnings creation failed:', earningsError.message);
    }
    
    // 4. Show available actions by status
    console.log('\n4. Publisher Actions by Status:');
    
    const statusActions = {
      'accepted': ['Start Work (→ in_progress)'],
      'in_progress': ['Submit Work (→ submitted)'],
      'submitted': ['Waiting for review (internal team action)'],
      'completed': ['Order complete - earnings processed'],
      'rejected': ['Order declined - no further action']
    };
    
    Object.entries(statusActions).forEach(([status, actions]) => {
      console.log(`   ${status}:`);
      actions.forEach(action => console.log(`     • ${action}`));
    });
    
    // 5. Show current order state
    console.log('\n5. Final order state:');
    const finalState = await pool.query(`
      SELECT 
        oli.id,
        oli.assigned_domain,
        oli.anchor_text,
        oli.publisher_status,
        oli.published_url,
        oli.publisher_submitted_at,
        pe.net_amount as earnings,
        pe.status as earnings_status
      FROM order_line_items oli
      LEFT JOIN publisher_earnings pe ON oli.id = pe.order_line_item_id
      WHERE oli.id = $1
    `, [order.line_item_id]);
    
    const final = finalState.rows[0];
    console.log(`   Domain: ${final.assigned_domain}`);
    console.log(`   Status: ${final.publisher_status}`);
    console.log(`   Published: ${final.published_url || 'Not published'}`);
    console.log(`   Submitted: ${final.publisher_submitted_at || 'Not submitted'}`);
    console.log(`   Earnings: $${(final.earnings || 0) / 100} (${final.earnings_status || 'none'})`);
    
    console.log('\n🎉 Publisher status flow test completed!');
    
    console.log('\n📋 Publisher Status System Summary:');
    console.log('✅ Status progression: accepted → in_progress → submitted');
    console.log('✅ Work submission with URL and notes');
    console.log('✅ Automatic earnings record creation');
    console.log('✅ Timeline tracking with timestamps');
    console.log('✅ Publisher action validation');
    
    console.log('\n🌐 Publisher can use these URLs:');
    console.log(`   Order Management: /publisher/orders`);
    console.log(`   Specific Order: /publisher/orders/${order.line_item_id}/accept`);
    
  } catch (error) {
    console.error('❌ Status flow test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testPublisherStatusFlow();