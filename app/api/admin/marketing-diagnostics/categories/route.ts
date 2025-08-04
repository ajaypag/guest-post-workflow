import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all unique categories with counts
    const categories = await db.execute(sql`
      SELECT 
        UNNEST(categories) as category,
        COUNT(*) as count
      FROM websites
      WHERE categories IS NOT NULL 
        AND categories != '{}'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 20
    `);
    
    // Get total unique categories
    const totalCategories = await db.execute(sql`
      SELECT COUNT(DISTINCT UNNEST(categories)) as total
      FROM websites
      WHERE categories IS NOT NULL
    `);
    
    // Check categories that would be shown publicly
    const publicCategories = await db.execute(sql`
      SELECT 
        UNNEST(categories) as category,
        COUNT(*) as count
      FROM websites
      WHERE categories IS NOT NULL 
        AND categories != '{}'
        AND overall_quality IN ('Excellent', 'Good', 'Fair')
      GROUP BY category
      HAVING COUNT(*) >= 5
      ORDER BY count DESC
    `);
    
    // Get websites for a sample category
    let sampleCategoryData = null;
    if (categories.rows.length > 0) {
      const sampleCategory = categories.rows[0]?.category;
      const sampleWebsites = await db.execute(sql`
        SELECT domain, domain_rating, overall_quality
        FROM websites
        WHERE categories @> ARRAY[${sampleCategory}]::text[]
        LIMIT 5
      `);
      
      sampleCategoryData = {
        category: sampleCategory,
        websites: sampleWebsites.rows
      };
    }
    
    return NextResponse.json({
      totalCategories: parseInt(totalCategories.rows[0]?.total || '0'),
      topCategories: categories.rows,
      publicCategories: publicCategories.rows,
      publicCategoryCount: publicCategories.rows.length,
      sampleCategoryData,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
      code: error.code,
    });
  }
}