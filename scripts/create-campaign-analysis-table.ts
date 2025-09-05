import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

async function createTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_prod',
  });
  const db = drizzle(pool);

  try {
    // Create the campaign_analysis_history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_analysis_history (
        id SERIAL PRIMARY KEY,
        workspace VARCHAR(255) NOT NULL DEFAULT 'main',
        campaign_id VARCHAR(255) NOT NULL,
        campaign_name VARCHAR(500),
        analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        analyzed_by UUID REFERENCES users(id),
        total_emails_checked INTEGER DEFAULT 0,
        new_emails_found INTEGER DEFAULT 0,
        duplicates_found INTEGER DEFAULT 0,
        ignored_emails INTEGER DEFAULT 0,
        campaigns_analyzed TEXT[],
        analysis_type VARCHAR(50) DEFAULT 'manual',
        analysis_metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Table campaign_analysis_history created successfully');
    
    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_campaign_analysis_workspace ON campaign_analysis_history (workspace)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_campaign_analysis_campaign_id ON campaign_analysis_history (campaign_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_campaign_analysis_analyzed_at ON campaign_analysis_history (analyzed_at DESC)`);
    
    console.log('✅ Indexes created successfully');
    
    // Verify it exists
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'campaign_analysis_history'
      )
    `);
    
    console.log('✅ Verification:', (result as any).rows[0].exists ? 'Table EXISTS' : 'Table MISSING');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

createTable();