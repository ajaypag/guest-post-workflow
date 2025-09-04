import { NextRequest, NextResponse } from 'next/server';
import { requireInternalUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  // Check authentication - internal users only
  const authCheck = await requireInternalUser(request);
  if (authCheck instanceof NextResponse) {
    return authCheck;
  }

  try {
    // Run the migration for niche tracking
    await db.execute(sql`
      -- Add last_niche_check to websites table
      ALTER TABLE websites 
      ADD COLUMN IF NOT EXISTS last_niche_check TIMESTAMP,
      ADD COLUMN IF NOT EXISTS suggested_niches TEXT[],
      ADD COLUMN IF NOT EXISTS suggested_categories TEXT[],
      ADD COLUMN IF NOT EXISTS niche_confidence DECIMAL(3,2)
    `);

    // Create index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_websites_last_niche_check 
      ON websites(last_niche_check)
    `);

    // Create suggested tags table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS suggested_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tag_name VARCHAR(255) NOT NULL,
        tag_type VARCHAR(50) NOT NULL CHECK (tag_type IN ('niche', 'category', 'website_type')),
        website_count INTEGER DEFAULT 1,
        example_websites TEXT[],
        first_suggested_at TIMESTAMP DEFAULT NOW(),
        approved BOOLEAN DEFAULT false,
        approved_at TIMESTAMP,
        approved_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(tag_name, tag_type)
      )
    `);

    // Create indexes for suggested tags
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_suggested_tags_type ON suggested_tags(tag_type)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_suggested_tags_approved ON suggested_tags(approved)
    `);

    return NextResponse.json({ 
      success: true,
      message: 'Migration completed successfully'
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}