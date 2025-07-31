import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'order_site_selections'
    `);

    // Check if indexes exist
    const indexCheck = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'order_site_selections'
      AND indexname IN ('idx_selections_group', 'idx_selections_status', 'idx_selections_domain')
    `);

    const tableExists = tableCheck.rows.length > 0;
    const indexExists = indexCheck.rows.length >= 3;

    // Get column count if table exists
    let columnCount = 0;
    if (tableExists) {
      const columnCheck = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.columns 
        WHERE table_name = 'order_site_selections'
      `);
      columnCount = parseInt((columnCheck.rows[0] as any).count);
    }

    return NextResponse.json({
      success: true,
      migration: {
        tableExists,
        indexExists,
        columnCount
      }
    });

  } catch (error: any) {
    console.error('Error verifying site selections table:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}