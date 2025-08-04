import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all unique categories with counts
    const categoriesResult = await db.execute(sql`
      SELECT 
        UNNEST(categories) as category,
        COUNT(*) as count
      FROM websites
      WHERE categories IS NOT NULL 
        AND categories != '{}'
        AND overall_quality IN ('Excellent', 'Good', 'Fair')
      GROUP BY category
      ORDER BY count DESC
    `);

    const categories = categoriesResult.rows.map((row: any) => ({
      name: row.category,
      count: parseInt(row.count),
      slug: row.category
        .toLowerCase()
        .replace(/[&\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}