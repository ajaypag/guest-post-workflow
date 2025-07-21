import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST() {
  try {
    // Create qualification_jobs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS qualification_jobs (
        id VARCHAR(36) PRIMARY KEY,
        client_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        check_depth VARCHAR(50) DEFAULT 'balanced',
        total_sites INTEGER DEFAULT 0,
        processed_sites INTEGER DEFAULT 0,
        completed_sites INTEGER DEFAULT 0,
        error_sites INTEGER DEFAULT 0,
        total_api_calls INTEGER DEFAULT 0,
        estimated_cost DECIMAL(10, 4) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    // Create qualification_sites table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS qualification_sites (
        id VARCHAR(36) PRIMARY KEY,
        job_id VARCHAR(36) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        url TEXT,
        site_name VARCHAR(255),
        monthly_traffic INTEGER,
        domain_authority INTEGER,
        niche VARCHAR(255),
        contact_info TEXT,
        guest_post_price DECIMAL(10, 2),
        link_insertion_price DECIMAL(10, 2),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        checked_at TIMESTAMP,
        total_keywords_found INTEGER DEFAULT 0,
        relevant_keywords_found INTEGER DEFAULT 0,
        error_message TEXT,
        source_type VARCHAR(50) DEFAULT 'manual',
        airtable_record_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES qualification_jobs(id) ON DELETE CASCADE
      )
    `);

    // Create site_rankings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS site_rankings (
        id VARCHAR(36) PRIMARY KEY,
        site_id VARCHAR(36) NOT NULL,
        job_id VARCHAR(36) NOT NULL,
        keyword VARCHAR(500) NOT NULL,
        rank_absolute INTEGER NOT NULL,
        search_engine VARCHAR(50) DEFAULT 'google',
        keyword_difficulty INTEGER,
        search_volume INTEGER,
        cpc DECIMAL(10, 4),
        competition_level VARCHAR(50),
        ranking_url TEXT,
        domain VARCHAR(255),
        topic_match VARCHAR(100),
        collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES qualification_sites(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES qualification_jobs(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_qualification_sites_job_id ON qualification_sites(job_id);
      CREATE INDEX IF NOT EXISTS idx_qualification_sites_status ON qualification_sites(status);
      CREATE INDEX IF NOT EXISTS idx_site_rankings_site_id ON site_rankings(site_id);
      CREATE INDEX IF NOT EXISTS idx_site_rankings_job_id ON site_rankings(job_id);
      CREATE INDEX IF NOT EXISTS idx_site_rankings_keyword ON site_rankings(keyword);
      CREATE INDEX IF NOT EXISTS idx_site_rankings_rank ON site_rankings(rank_absolute);
    `);

    return NextResponse.json({ 
      success: true,
      message: 'Bulk qualification tables created successfully'
    });
  } catch (error) {
    console.error('Failed to create bulk qualification tables:', error);
    return NextResponse.json({ 
      error: 'Failed to create tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}