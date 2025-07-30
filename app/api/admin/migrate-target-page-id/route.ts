import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'add') {
      // Check if column already exists
      const checkQuery = sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        AND column_name = 'target_page_id'
      `;
      
      const existing = await db.execute(checkQuery);
      
      if (existing.rows.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Column target_page_id already exists'
        });
      }

      // Add the column
      await db.execute(sql`
        ALTER TABLE order_items 
        ADD COLUMN target_page_id UUID
      `);

      // Add index for better performance
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_order_items_target_page_id 
        ON order_items(target_page_id)
      `);

      // Add comment
      await db.execute(sql`
        COMMENT ON COLUMN order_items.target_page_id IS 
        'References the target page selected for this domain from the client target pages'
      `);

      return NextResponse.json({
        success: true,
        message: 'Successfully added target_page_id column to order_items table'
      });
    } else if (action === 'remove') {
      // Remove the column
      await db.execute(sql`
        ALTER TABLE order_items 
        DROP COLUMN IF EXISTS target_page_id
      `);

      return NextResponse.json({
        success: true,
        message: 'Successfully removed target_page_id column'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use "add" or "remove"'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Migration failed'
    }, { status: 500 });
  }
}