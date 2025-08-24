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
    console.log('Creating email processing tables...');

    // Create email_processing_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_processing_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id VARCHAR(255),
        campaign_id VARCHAR(255),
        campaign_name VARCHAR(255),
        campaign_type VARCHAR(50),
        email_from VARCHAR(255) NOT NULL,
        email_to VARCHAR(255),
        email_subject VARCHAR(500),
        email_message_id VARCHAR(255),
        received_at TIMESTAMP,
        raw_content TEXT NOT NULL,
        html_content TEXT,
        parsed_data JSONB DEFAULT '{}',
        confidence_score DECIMAL(3,2),
        parsing_errors TEXT[],
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        processed_at TIMESTAMP,
        processing_duration_ms INTEGER,
        thread_id VARCHAR(255),
        reply_count INTEGER DEFAULT 0,
        is_auto_reply BOOLEAN DEFAULT FALSE,
        original_outreach_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created email_processing_logs table');

    // Create webhook_security_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS webhook_security_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        signature_valid BOOLEAN,
        signature_provided VARCHAR(500),
        timestamp_valid BOOLEAN,
        ip_allowed BOOLEAN,
        rate_limit_key VARCHAR(255),
        requests_in_window INTEGER,
        allowed BOOLEAN,
        rejection_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created webhook_security_logs table');

    // Create email_review_queue table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_review_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        log_id UUID REFERENCES email_processing_logs(id) ON DELETE CASCADE,
        publisher_id UUID REFERENCES publishers(id) ON DELETE SET NULL,
        priority INTEGER DEFAULT 50,
        status VARCHAR(50) DEFAULT 'pending',
        queue_reason VARCHAR(100),
        suggested_actions JSONB DEFAULT '{}',
        missing_fields TEXT[],
        review_notes TEXT,
        corrections_made JSONB DEFAULT '{}',
        assigned_to UUID REFERENCES users(id),
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMP,
        auto_approve_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created email_review_queue table');

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

    // Create shadow_publisher_websites table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shadow_publisher_websites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        publisher_id UUID REFERENCES publishers(id) NOT NULL,
        website_id UUID REFERENCES websites(id) NOT NULL,
        confidence DECIMAL(3,2),
        source VARCHAR(50),
        extraction_method VARCHAR(100),
        verified BOOLEAN DEFAULT FALSE,
        verified_by UUID REFERENCES users(id),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_shadow_publisher_website UNIQUE(publisher_id, website_id)
      )
    `);
    console.log('✅ Created shadow_publisher_websites table');

    console.log('✅ All email processing tables created successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    await pool.end();
    process.exit(1);
  }
}

createTables();