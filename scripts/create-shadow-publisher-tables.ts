import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

async function createTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool);

  try {
    console.log('Creating shadow publisher system tables...');

    // Create publishers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS publishers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        contact_name VARCHAR(255),
        company_name VARCHAR(255),
        phone VARCHAR(50),
        tax_id VARCHAR(100),
        payment_email VARCHAR(255),
        payment_method VARCHAR(50),
        bank_name VARCHAR(255),
        bank_account_number VARCHAR(255),
        bank_routing_number VARCHAR(50),
        commission_rate DECIMAL(5,4) DEFAULT 0.8000,
        minimum_payout DECIMAL(10,2) DEFAULT 50.00,
        status VARCHAR(50) DEFAULT 'pending',
        account_status VARCHAR(50) DEFAULT 'unclaimed',
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255),
        source VARCHAR(50),
        source_metadata TEXT,
        claimed_at TIMESTAMP,
        confidence_score VARCHAR(10),
        invitation_token VARCHAR(255),
        invitation_sent_at TIMESTAMP,
        invitation_expires_at TIMESTAMP,
        claim_verification_code VARCHAR(10),
        claim_attempts INTEGER DEFAULT 0,
        last_claim_attempt TIMESTAMP,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        content_guidelines TEXT,
        prohibited_topics TEXT[],
        turnaround_time INTEGER,
        internal_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login_at TIMESTAMP
      )
    `);
    console.log('✅ Created publishers table');

    // Create websites table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS websites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain VARCHAR(255) UNIQUE NOT NULL,
        domain_rating INTEGER,
        total_traffic BIGINT,
        guest_post_cost INTEGER,
        categories TEXT[],
        niche TEXT[],
        overall_quality VARCHAR(50),
        has_guest_post BOOLEAN,
        source VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        airtable_created_at TIMESTAMP,
        airtable_updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created websites table');

    // Create publisher_websites table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS publisher_websites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        publisher_id UUID REFERENCES publishers(id),
        website_id UUID REFERENCES websites(id),
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(publisher_id, website_id)
      )
    `);
    console.log('✅ Created publisher_websites table');

    // Create publisher_offerings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS publisher_offerings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        publisher_id UUID REFERENCES publishers(id) NOT NULL,
        offering_type VARCHAR(100) NOT NULL,
        base_price INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        turnaround_days INTEGER DEFAULT 7,
        current_availability VARCHAR(50) DEFAULT 'available',
        is_active BOOLEAN DEFAULT TRUE,
        attributes JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created publisher_offerings table');

    // Create publisher_offering_relationships table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS publisher_offering_relationships (
        publisher_id UUID REFERENCES publishers(id) NOT NULL,
        offering_id UUID REFERENCES publisher_offerings(id) NOT NULL,
        website_id UUID REFERENCES websites(id) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (publisher_id, offering_id, website_id)
      )
    `);
    console.log('✅ Created publisher_offering_relationships table');

    // Create publisher_pricing_rules table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS publisher_pricing_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        publisher_offering_id UUID REFERENCES publisher_offerings(id) NOT NULL,
        rule_type VARCHAR(50) NOT NULL,
        rule_name VARCHAR(255) NOT NULL,
        description TEXT,
        conditions JSONB NOT NULL,
        actions JSONB NOT NULL,
        priority INTEGER DEFAULT 0,
        is_cumulative BOOLEAN DEFAULT FALSE,
        auto_apply BOOLEAN DEFAULT TRUE,
        requires_approval BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created publisher_pricing_rules table');

    // Create users table (for references)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created users table');

    // Create publisher_automation_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS publisher_automation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email_log_id UUID REFERENCES email_processing_logs(id),
        publisher_id UUID REFERENCES publishers(id),
        action VARCHAR(100) NOT NULL,
        action_status VARCHAR(50) DEFAULT 'success',
        previous_data JSONB,
        new_data JSONB,
        fields_updated TEXT[],
        confidence DECIMAL(3,2),
        match_method VARCHAR(50),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created publisher_automation_logs table');

    console.log('✅ All shadow publisher tables created successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    await pool.end();
    process.exit(1);
  }
}

createTables();