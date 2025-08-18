import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Running multiple offerings migration...');
    
    // Execute the migration SQL
    await db.execute(sql`
      BEGIN;
      
      -- Remove the existing constraint if it exists
      ALTER TABLE publisher_offering_relationships 
      DROP CONSTRAINT IF EXISTS publisher_offering_relationships_publisher_id_website_id_key;
      
      -- Add the new constraint that allows multiple offerings per website
      ALTER TABLE publisher_offering_relationships 
      ADD CONSTRAINT publisher_offering_relationships_unique_offering 
      UNIQUE (publisher_id, website_id, offering_id);
      
      -- Add a comment explaining the new constraint
      COMMENT ON CONSTRAINT publisher_offering_relationships_unique_offering 
      ON publisher_offering_relationships IS 
      'Allows multiple offerings per publisher-website pair, but prevents duplicate offering relationships';
      
      COMMIT;
    `);

    console.log('✅ Multiple offerings migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully. Publishers can now create multiple offerings per website.'
    });

  } catch (error) {
    console.error('❌ Multiple offerings migration failed:', error);
    
    // Try to rollback if possible
    try {
      await db.execute(sql`ROLLBACK;`);
      console.log('🔄 Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }
    
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}