const { Pool } = require('pg');

async function testDuplicatePublisherHandling() {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'guest_post_workflow',
    password: 'postgres',
    port: 5434,
  });

  try {
    console.log('🔄 TESTING DUPLICATE PUBLISHER HANDLING');
    console.log('======================================\n');

    // Get an existing active publisher
    const existingPublisher = await pool.query(`
      SELECT id, email, contact_name, company_name, account_status 
      FROM publishers 
      WHERE account_status = 'active' 
      LIMIT 1
    `);

    if (existingPublisher.rows.length === 0) {
      console.log('❌ No active publishers found for testing');
      return;
    }

    const publisher = existingPublisher.rows[0];
    console.log('📋 TEST SUBJECT:');
    console.log(`   Publisher: ${publisher.contact_name} (${publisher.email})`);
    console.log(`   Status: ${publisher.account_status}\n`);

    // Check existing offerings
    const existingOfferings = await pool.query(`
      SELECT po.*, por.website_id, w.domain
      FROM publisher_offerings po
      LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id
      LEFT JOIN websites w ON por.website_id = w.id
      WHERE po.publisher_id = $1
    `, [publisher.id]);

    console.log('📈 EXISTING OFFERINGS:');
    if (existingOfferings.rows.length > 0) {
      existingOfferings.rows.forEach((offering, i) => {
        console.log(`   ${i + 1}. ${offering.offering_type}: $${offering.base_price} (${offering.domain || 'No website'})`);
      });
    } else {
      console.log('   None found');
    }
    console.log('');

    // Check existing websites
    const existingWebsites = await pool.query(`
      SELECT w.domain, pw.added_at
      FROM websites w
      JOIN publisher_websites pw ON w.id = pw.website_id
      WHERE pw.publisher_id = $1
    `, [publisher.id]);

    console.log('🌐 EXISTING WEBSITES:');
    if (existingWebsites.rows.length > 0) {
      existingWebsites.rows.forEach((website, i) => {
        console.log(`   ${i + 1}. ${website.domain} (added: ${website.added_at?.toISOString().split('T')[0]})`);
      });
    } else {
      console.log('   None found');
    }
    console.log('');

    // Now simulate a ManyReach webhook for this existing publisher
    console.log('🎯 SIMULATING MANYREACH WEBHOOK');
    console.log('Test Case: Existing publisher replies with updated pricing and new website\n');

    // Create test email log entry
    const emailLog = await pool.query(`
      INSERT INTO email_processing_logs (
        webhook_id, campaign_id, campaign_name, campaign_type,
        email_from, email_subject, raw_content,
        parsed_data, confidence_score, status,
        created_at, updated_at
      ) VALUES (
        'test-webhook-${Date.now()}',
        'test-campaign-123',
        'Guest Post Outreach Q4',
        'outreach',
        $1,
        'Re: Guest posting opportunity',
        'Thanks for reaching out! Our updated rates are $200 for guest posts on techblog.com and we also have a new site at newtech.blog with $150 rates.',
        $2,
        0.85,
        'parsed',
        NOW(),
        NOW()
      ) RETURNING id
    `, [
      publisher.email,
      JSON.stringify({
        sender: {
          email: publisher.email,
          name: publisher.contact_name,
          company: publisher.company_name,
          confidence: 0.95
        },
        websites: [
          { domain: 'techblog.com', confidence: 0.90 },
          { domain: 'newtech.blog', confidence: 0.85 }
        ],
        offerings: [
          {
            type: 'guest_post',
            basePrice: 200,
            currency: 'USD',
            turnaroundDays: 5,
            confidence: 0.88
          },
          {
            type: 'guest_post',
            basePrice: 150,
            currency: 'USD',
            turnaroundDays: 7,
            confidence: 0.85
          }
        ],
        overallConfidence: 0.85,
        missingFields: []
      })
    ]);

    console.log(`✅ Created test email log: ${emailLog.rows[0].id}`);

    // Test our ShadowPublisherService by calling the webhook endpoint
    console.log('🔄 Testing webhook processing...\n');

    const testPayload = {
      eventId: 'prospect_replied',
      campaignId: 'test-campaign-123',
      campaignName: 'Guest Post Outreach Q4',
      campaignType: 'outreach',
      email: {
        from: publisher.email,
        to: 'outreach@linkio.com',
        subject: 'Re: Guest posting opportunity',
        messageId: `test-${Date.now()}@manyreach.com`,
        receivedAt: new Date().toISOString(),
        content: 'Thanks for reaching out! Our updated rates are $200 for guest posts on techblog.com and we also have a new site at newtech.blog with $150 rates.'
      }
    };

    console.log('📤 Webhook payload created');
    console.log('🎯 Expected behavior for existing publisher:');
    console.log('   ✓ Should detect existing publisher by email');
    console.log('   ✓ Should update existing offerings if confidence > 80%');
    console.log('   ✓ Should create normal website relationships (not shadow)');
    console.log('   ✓ Should skip review queue');
    console.log('   ✓ Should log as "existing_publisher_updated"\n');

    // Send test webhook request
    try {
      const response = await fetch('http://localhost:3001/api/webhooks/manyreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ManyReach-Signature': 'test-signature',
          'User-Agent': 'ManyReach-Webhook/1.0'
        },
        body: JSON.stringify(testPayload)
      });

      const result = await response.json();
      console.log(`📨 Webhook response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log('✅ Webhook processing completed successfully\n');
        
        // Verify the results
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for async processing
        
        console.log('🔍 VERIFYING RESULTS');
        console.log('===================\n');

        // Check automation logs
        const automationLogs = await pool.query(`
          SELECT action, action_status, match_method, confidence, metadata, created_at
          FROM publisher_automation_logs 
          WHERE publisher_id = $1 
          ORDER BY created_at DESC 
          LIMIT 3
        `, [publisher.id]);

        console.log('📝 AUTOMATION LOGS:');
        if (automationLogs.rows.length > 0) {
          automationLogs.rows.forEach((log, i) => {
            console.log(`   ${i + 1}. ${log.action} (${log.action_status}) - ${log.match_method} - confidence: ${log.confidence}`);
          });
        } else {
          console.log('   ❌ No automation logs found');
        }
        console.log('');

        // Check for new websites
        const newWebsites = await pool.query(`
          SELECT w.domain, pw.added_at
          FROM websites w
          JOIN publisher_websites pw ON w.id = pw.website_id
          WHERE pw.publisher_id = $1
          ORDER BY pw.added_at DESC
        `, [publisher.id]);

        console.log('🌐 UPDATED WEBSITES:');
        newWebsites.rows.forEach((website, i) => {
          const isNew = new Date(website.added_at) > new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
          console.log(`   ${i + 1}. ${website.domain} ${isNew ? '🆕' : ''}`);
        });
        console.log('');

        // Check updated offerings
        const updatedOfferings = await pool.query(`
          SELECT po.*, por.website_id, w.domain, po.updated_at
          FROM publisher_offerings po
          LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id
          LEFT JOIN websites w ON por.website_id = w.id
          WHERE po.publisher_id = $1
          ORDER BY po.updated_at DESC
        `, [publisher.id]);

        console.log('📈 UPDATED OFFERINGS:');
        updatedOfferings.rows.forEach((offering, i) => {
          const isUpdated = new Date(offering.updated_at) > new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
          console.log(`   ${i + 1}. ${offering.offering_type}: $${offering.base_price} (${offering.domain || 'No website'}) ${isUpdated ? '🆕' : ''}`);
        });
        console.log('');

        // Check review queue (should be empty for existing publishers)
        const reviewQueue = await pool.query(`
          SELECT COUNT(*) as count
          FROM email_review_queue erq
          JOIN email_processing_logs epl ON erq.log_id = epl.id
          WHERE epl.email_from = $1
          AND erq.created_at > NOW() - INTERVAL '5 minutes'
        `, [publisher.email]);

        console.log('📋 REVIEW QUEUE STATUS:');
        console.log(`   New entries for this publisher: ${reviewQueue.rows[0].count}`);
        console.log(`   Expected: 0 (existing publishers should skip review queue)\n`);

        // Summary
        console.log('📊 TEST SUMMARY');
        console.log('===============');
        const hasLogs = automationLogs.rows.length > 0;
        const hasExistingAction = automationLogs.rows.some(log => log.action.includes('existing'));
        const skippedQueue = parseInt(reviewQueue.rows[0].count) === 0;
        
        console.log(`✅ Automation logged: ${hasLogs ? 'YES' : 'NO'}`);
        console.log(`✅ Detected as existing: ${hasExistingAction ? 'YES' : 'NO'}`);
        console.log(`✅ Skipped review queue: ${skippedQueue ? 'YES' : 'NO'}`);
        
        if (hasLogs && hasExistingAction && skippedQueue) {
          console.log('\n🎉 DUPLICATE HANDLING TEST: ✅ PASSED');
          console.log('   The system correctly identified and updated the existing publisher!');
        } else {
          console.log('\n❌ DUPLICATE HANDLING TEST: ❌ FAILED');
          console.log('   The system did not handle the existing publisher correctly.');
        }

      } else {
        console.log('❌ Webhook failed:', result);
      }

    } catch (error) {
      console.log('❌ Webhook request failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await pool.end();
  }
}

testDuplicatePublisherHandling().catch(console.error);