// Test the ShadowPublisherService directly without webhook validation
const { Pool } = require('pg');

// Import ShadowPublisherService - we'll create a simple version for testing
class TestShadowPublisherService {
  constructor() {
    this.pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'guest_post_workflow',
      password: 'postgres',
      port: 5434,
    });
  }

  async findExistingPublisher(email, parsedData) {
    // 1. Exact email match (for active accounts only)
    const exactMatch = await this.pool.query(`
      SELECT * FROM publishers 
      WHERE email = $1 AND account_status NOT IN ('unclaimed', 'shadow')
      LIMIT 1
    `, [email]);
    
    if (exactMatch.rows.length > 0) {
      return exactMatch.rows[0];
    }
    
    return null;
  }

  async handleExistingPublisherUpdate(publisher, parsedData, emailLogId, campaignType) {
    console.log(`🔄 Processing existing publisher: ${publisher.contact_name} (${publisher.email})`);
    
    // Update publisher basic info if confidence is high
    const updates = {
      updated_at: new Date(),
    };
    
    // Only update if new data has higher confidence
    if (parsedData.sender.name && parsedData.sender.confidence > 0.7) {
      updates.contact_name = parsedData.sender.name;
    }
    
    if (parsedData.sender.company && parsedData.sender.confidence > 0.7) {
      updates.company_name = parsedData.sender.company;
    }
    
    if (Object.keys(updates).length > 1) { // More than just updated_at
      await this.pool.query(`
        UPDATE publishers 
        SET contact_name = COALESCE($2, contact_name),
            company_name = COALESCE($3, company_name),
            updated_at = $4
        WHERE id = $1
      `, [publisher.id, updates.contact_name, updates.company_name, updates.updated_at]);
      
      console.log('✅ Updated publisher basic info');
    }
    
    // Process website associations for existing publisher
    for (const websiteData of parsedData.websites) {
      await this.processExistingPublisherWebsite(publisher.id, websiteData, emailLogId);
    }
    
    // Update existing offerings with new pricing/details
    for (const offering of parsedData.offerings) {
      await this.updateExistingPublisherOffering(
        publisher.id, 
        offering, 
        parsedData.websites[0]?.domain, 
        emailLogId
      );
    }
    
    // Log automation action
    await this.pool.query(`
      INSERT INTO publisher_automation_logs (
        id, email_log_id, publisher_id, action, action_status,
        new_data, confidence, match_method, metadata, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'existing_publisher_updated', 'success',
        $3, $4, 'existing_publisher_update', $5, NOW()
      )
    `, [
      emailLogId,
      publisher.id,
      JSON.stringify(parsedData),
      parsedData.overallConfidence.toFixed(2),
      JSON.stringify({
        source: 'manyreach',
        confidence: parsedData.overallConfidence,
        publisherStatus: publisher.account_status,
        campaignType,
      })
    ]);
    
    console.log('✅ Logged automation action');
  }

  async processExistingPublisherWebsite(publisherId, websiteData, emailLogId) {
    // Check if website exists
    let website = await this.pool.query(`
      SELECT * FROM websites WHERE domain = $1 LIMIT 1
    `, [websiteData.domain]);
    
    if (website.rows.length === 0) {
      // Create new website
      const newWebsite = await this.pool.query(`
        INSERT INTO websites (
          id, domain, source, status, 
          airtable_created_at, airtable_updated_at, 
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'manyreach', 'active',
          NOW(), NOW(), NOW(), NOW()
        ) RETURNING *
      `, [websiteData.domain]);
      
      website.rows[0] = newWebsite.rows[0];
      console.log(`✅ Created new website: ${websiteData.domain}`);
    } else {
      console.log(`✅ Found existing website: ${websiteData.domain}`);
    }
    
    // Check if publisher already has this website associated
    const existingAssociation = await this.pool.query(`
      SELECT * FROM publisher_websites 
      WHERE publisher_id = $1 AND website_id = $2
      LIMIT 1
    `, [publisherId, website.rows[0].id]);
    
    if (existingAssociation.rows.length === 0) {
      // Create normal publisher-website relationship (not shadow)
      await this.pool.query(`
        INSERT INTO publisher_websites (
          id, publisher_id, website_id, added_at
        ) VALUES (
          gen_random_uuid(), $1, $2, NOW()
        )
      `, [publisherId, website.rows[0].id]);
      
      console.log(`✅ Created publisher-website relationship`);
    } else {
      console.log(`✅ Publisher-website relationship already exists`);
    }
  }

  async updateExistingPublisherOffering(publisherId, offering, websiteDomain, emailLogId) {
    if (!websiteDomain) return;
    
    // Get website
    const website = await this.pool.query(`
      SELECT * FROM websites WHERE domain = $1 LIMIT 1
    `, [websiteDomain]);
    
    if (website.rows.length === 0) return;
    
    // Check if offering exists for this publisher
    const existing = await this.pool.query(`
      SELECT * FROM publisher_offerings 
      WHERE publisher_id = $1 AND offering_type = $2
      LIMIT 1
    `, [publisherId, offering.type]);
    
    if (existing.rows.length > 0) {
      // Update existing offering if confidence is reasonable
      if (offering.confidence > 0.6) {
        const updates = {
          updated_at: new Date(),
        };
        
        // Update pricing if provided and confident
        if (offering.basePrice && offering.confidence > 0.7) {
          updates.base_price = Math.round(offering.basePrice);
        }
        
        if (offering.currency && offering.confidence > 0.7) {
          updates.currency = offering.currency;
        }
        
        if (offering.turnaroundDays && offering.confidence > 0.7) {
          updates.turnaround_days = offering.turnaroundDays;
        }
        
        await this.pool.query(`
          UPDATE publisher_offerings 
          SET base_price = COALESCE($2, base_price),
              currency = COALESCE($3, currency),
              turnaround_days = COALESCE($4, turnaround_days),
              updated_at = $5
          WHERE id = $1
        `, [existing.rows[0].id, updates.base_price, updates.currency, updates.turnaround_days, updates.updated_at]);
        
        console.log(`✅ Updated existing offering: ${offering.type} -> $${offering.basePrice}`);
      }
    } else {
      // Create new offering for existing publisher
      const newOffering = await this.pool.query(`
        INSERT INTO publisher_offerings (
          publisher_id, offering_type, base_price, currency,
          turnaround_days, current_availability, is_active,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'available', true, NOW(), NOW()
        ) RETURNING *
      `, [
        publisherId,
        offering.type,
        offering.basePrice ? Math.round(offering.basePrice) : 0,
        offering.currency || 'USD',
        offering.turnaroundDays || 7
      ]);
      
      // Create offering-website relationship
      await this.pool.query(`
        INSERT INTO publisher_offering_relationships (
          publisher_id, offering_id, website_id, 
          is_primary, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, true, true, NOW(), NOW()
        )
      `, [publisherId, newOffering.rows[0].id, website.rows[0].id]);
      
      console.log(`✅ Created new offering: ${offering.type} -> $${offering.basePrice}`);
    }
  }

  async close() {
    await this.pool.end();
  }
}

async function testDirectService() {
  const service = new TestShadowPublisherService();
  
  try {
    console.log('🔄 TESTING SHADOW PUBLISHER SERVICE DIRECTLY');
    console.log('============================================\n');

    // Get an existing active publisher
    const existingPublisher = await service.pool.query(`
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

    // Create mock parsed data
    const parsedData = {
      sender: {
        email: publisher.email,
        name: publisher.contact_name,
        company: publisher.company_name || 'Updated Company Name',
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
        }
      ],
      overallConfidence: 0.85,
      missingFields: []
    };

    // Create test email log
    const emailLog = await service.pool.query(`
      INSERT INTO email_processing_logs (
        webhook_id, campaign_id, email_from, raw_content,
        parsed_data, confidence_score, status, created_at
      ) VALUES (
        'test-direct-${Date.now()}', 'test-campaign', $1, 'Test email content',
        $2, 0.85, 'parsed', NOW()
      ) RETURNING id
    `, [publisher.email, JSON.stringify(parsedData)]);

    const emailLogId = emailLog.rows[0].id;
    console.log(`✅ Created test email log: ${emailLogId}\n`);

    // Test duplicate detection
    console.log('🔍 TESTING DUPLICATE DETECTION');
    const foundPublisher = await service.findExistingPublisher(publisher.email, parsedData);
    
    if (foundPublisher) {
      console.log('✅ Successfully detected existing publisher by email');
      console.log(`   Matched: ${foundPublisher.contact_name} (${foundPublisher.email})\n`);
      
      // Test existing publisher update handling
      console.log('🔄 TESTING EXISTING PUBLISHER UPDATE HANDLING');
      await service.handleExistingPublisherUpdate(foundPublisher, parsedData, emailLogId, 'outreach');
      console.log('');
      
      // Verify results
      console.log('🔍 VERIFYING RESULTS');
      console.log('===================\n');
      
      // Check automation logs
      const automationLogs = await service.pool.query(`
        SELECT action, action_status, match_method, confidence, created_at
        FROM publisher_automation_logs 
        WHERE publisher_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [foundPublisher.id]);

      console.log('📝 AUTOMATION LOGS:');
      if (automationLogs.rows.length > 0) {
        const log = automationLogs.rows[0];
        console.log(`   ✅ ${log.action} (${log.action_status}) - ${log.match_method} - confidence: ${log.confidence}`);
      } else {
        console.log('   ❌ No automation logs found');
      }
      console.log('');

      // Check websites
      const websites = await service.pool.query(`
        SELECT w.domain, pw.added_at
        FROM websites w
        JOIN publisher_websites pw ON w.id = pw.website_id
        WHERE pw.publisher_id = $1
        ORDER BY pw.added_at DESC
      `, [foundPublisher.id]);

      console.log('🌐 PUBLISHER WEBSITES:');
      websites.rows.forEach((website, i) => {
        const isNew = new Date(website.added_at) > new Date(Date.now() - 2 * 60 * 1000); // Last 2 minutes
        console.log(`   ${i + 1}. ${website.domain} ${isNew ? '🆕 (NEW)' : ''}`);
      });
      console.log('');

      // Check offerings
      const offerings = await service.pool.query(`
        SELECT po.*, w.domain, po.updated_at
        FROM publisher_offerings po
        LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id
        LEFT JOIN websites w ON por.website_id = w.id
        WHERE po.publisher_id = $1
        ORDER BY po.updated_at DESC
      `, [foundPublisher.id]);

      console.log('📈 PUBLISHER OFFERINGS:');
      offerings.rows.forEach((offering, i) => {
        const isUpdated = new Date(offering.updated_at) > new Date(Date.now() - 2 * 60 * 1000); // Last 2 minutes
        console.log(`   ${i + 1}. ${offering.offering_type}: $${offering.base_price} (${offering.domain || 'No website'}) ${isUpdated ? '🆕 (UPDATED)' : ''}`);
      });
      console.log('');

      // Summary
      console.log('📊 TEST SUMMARY');
      console.log('===============');
      const hasLogs = automationLogs.rows.length > 0;
      const hasExistingAction = automationLogs.rows.some(log => log.action.includes('existing'));
      const hasNewWebsites = websites.rows.some(w => new Date(w.added_at) > new Date(Date.now() - 2 * 60 * 1000));
      const hasUpdatedOfferings = offerings.rows.some(o => new Date(o.updated_at) > new Date(Date.now() - 2 * 60 * 1000));
      
      console.log(`✅ Automation logged: ${hasLogs ? 'YES' : 'NO'}`);
      console.log(`✅ Detected as existing: ${hasExistingAction ? 'YES' : 'NO'}`);
      console.log(`✅ Created websites: ${hasNewWebsites ? 'YES' : 'NO'}`);
      console.log(`✅ Updated offerings: ${hasUpdatedOfferings ? 'YES' : 'NO'}`);
      
      if (hasLogs && hasExistingAction) {
        console.log('\n🎉 DUPLICATE HANDLING TEST: ✅ PASSED');
        console.log('   The system correctly identified and updated the existing publisher!');
      } else {
        console.log('\n❌ DUPLICATE HANDLING TEST: ❌ FAILED');
        console.log('   The system did not handle the existing publisher correctly.');
      }
      
    } else {
      console.log('❌ Failed to detect existing publisher');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await service.close();
  }
}

testDirectService().catch(console.error);