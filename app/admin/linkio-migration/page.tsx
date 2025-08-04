import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export default async function LinkioMigrationPage() {
  let migrationResult = null;
  let error = null;

  try {
    // Create enums
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE page_type AS ENUM (
          'landing_page',
          'blog_post', 
          'tool_page',
          'resource_page',
          'case_study',
          'other'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE recreation_status AS ENUM (
          'identified',
          'analyzed',
          'in_progress',
          'completed',
          'published',
          'skipped'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create linkio_pages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS linkio_pages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        
        -- Original Linkio info
        original_url TEXT NOT NULL UNIQUE,
        original_title TEXT,
        original_meta_description TEXT,
        
        -- Page categorization
        page_type page_type NOT NULL DEFAULT 'other',
        category VARCHAR(100),
        priority INTEGER DEFAULT 0,
        
        -- Our recreation info
        recreation_status recreation_status NOT NULL DEFAULT 'identified',
        our_slug VARCHAR(255),
        our_title TEXT,
        our_meta_description TEXT,
        
        -- Content analysis
        content_structure JSONB,
        key_features JSONB,
        word_count INTEGER,
        has_video BOOLEAN DEFAULT false,
        has_tools BOOLEAN DEFAULT false,
        has_cta BOOLEAN DEFAULT true,
        
        -- Notes and metadata
        notes TEXT,
        skip_reason TEXT,
        
        -- Timestamps
        identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        analyzed_at TIMESTAMP,
        completed_at TIMESTAMP,
        published_at TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create linkio_components table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS linkio_components (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        page_id UUID REFERENCES linkio_pages(id) NOT NULL,
        
        component_type VARCHAR(50) NOT NULL,
        component_name VARCHAR(255),
        original_content JSONB,
        our_content JSONB,
        
        is_recreated BOOLEAN DEFAULT false,
        notes TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create linkio_assets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS linkio_assets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        page_id UUID REFERENCES linkio_pages(id) NOT NULL,
        
        asset_type VARCHAR(50) NOT NULL,
        original_url TEXT NOT NULL,
        description TEXT,
        alt_text TEXT,
        
        needs_recreation BOOLEAN DEFAULT true,
        our_url TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create linkio_blog_categories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS linkio_blog_categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        category_slug VARCHAR(100) NOT NULL UNIQUE,
        post_count INTEGER DEFAULT 0,
        description TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_linkio_pages_status ON linkio_pages(recreation_status);
      CREATE INDEX IF NOT EXISTS idx_linkio_pages_type ON linkio_pages(page_type);
      CREATE INDEX IF NOT EXISTS idx_linkio_pages_priority ON linkio_pages(priority);
      CREATE INDEX IF NOT EXISTS idx_linkio_components_page_id ON linkio_components(page_id);
      CREATE INDEX IF NOT EXISTS idx_linkio_assets_page_id ON linkio_assets(page_id);
    `);

    migrationResult = 'Migration completed successfully!';
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Migration error:', e);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Linkio Recreation Database Migration</h1>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Migration Status</h2>
          
          {migrationResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800">{migrationResult}</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>This migration creates the following tables:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>linkio_pages</strong> - Main table for tracking pages to recreate</li>
              <li><strong>linkio_components</strong> - Individual page components/sections</li>
              <li><strong>linkio_assets</strong> - Images, videos, and other assets</li>
              <li><strong>linkio_blog_categories</strong> - Blog category structure</li>
            </ul>
            
            <p className="mt-4">It also creates necessary enums and indexes for optimal performance.</p>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <a 
              href="/admin/linkio"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Linkio Manager →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}