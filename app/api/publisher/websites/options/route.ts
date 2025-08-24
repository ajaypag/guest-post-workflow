import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';

// GET /api/publisher/websites/options - Get unique categories, niches, and website types
export async function GET(request: NextRequest) {
  try {
    // Get all unique values from the websites table
    const result = await db.execute(sql`
      WITH all_categories AS (
        SELECT DISTINCT unnest(categories) as value 
        FROM ${websites}
        WHERE categories IS NOT NULL
      ),
      all_niches AS (
        SELECT DISTINCT unnest(niche) as value 
        FROM ${websites}
        WHERE niche IS NOT NULL
      ),
      all_types AS (
        SELECT DISTINCT unnest(website_type) as value 
        FROM ${websites}
        WHERE website_type IS NOT NULL
      )
      SELECT 
        COALESCE((SELECT json_agg(DISTINCT value ORDER BY value) FROM all_categories), '[]'::json) as categories,
        COALESCE((SELECT json_agg(DISTINCT value ORDER BY value) FROM all_niches), '[]'::json) as niches,
        COALESCE((SELECT json_agg(DISTINCT value ORDER BY value) FROM all_types), '[]'::json) as website_types
    `);

    const data = result.rows[0] as any;
    
    // Add some default options if the database is empty
    const defaultCategories = ['Business', 'Technology', 'Health', 'Finance', 'Marketing'];
    const defaultNiches = ['B2B', 'B2C', 'SaaS', 'E-commerce', 'Healthcare'];
    const defaultTypes = ['Blog', 'News Site', 'Magazine', 'Corporate Site', 'Forum'];
    
    return NextResponse.json({
      categories: data?.categories?.length > 0 ? data.categories : defaultCategories,
      niches: data?.niches?.length > 0 ? data.niches : defaultNiches,
      websiteTypes: data?.website_types?.length > 0 ? data.website_types : defaultTypes
    });

  } catch (error) {
    console.error('Error fetching website options:', error);
    
    // Return defaults on error
    return NextResponse.json({
      categories: ['Business', 'Technology', 'Health', 'Finance', 'Marketing'],
      niches: ['B2B', 'B2C', 'SaaS', 'E-commerce', 'Healthcare'],
      websiteTypes: ['Blog', 'News Site', 'Magazine', 'Corporate Site', 'Forum']
    });
  }
}