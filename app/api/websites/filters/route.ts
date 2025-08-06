import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get all unique categories, types, and niches from active guest post sites
    const result = await db.execute(sql`
      SELECT 
        ARRAY(
          SELECT DISTINCT unnest(categories) 
          FROM ${websites} 
          WHERE ${websites.hasGuestPost} = true 
          AND ${websites.status} = 'Active'
          AND categories IS NOT NULL
          ORDER BY 1
        ) as categories,
        ARRAY(
          SELECT DISTINCT unnest(website_type) 
          FROM ${websites} 
          WHERE ${websites.hasGuestPost} = true 
          AND ${websites.status} = 'Active'
          AND website_type IS NOT NULL
          ORDER BY 1
        ) as website_types,
        ARRAY(
          SELECT DISTINCT unnest(niche) 
          FROM ${websites} 
          WHERE ${websites.hasGuestPost} = true 
          AND ${websites.status} = 'Active'
          AND niche IS NOT NULL
          ORDER BY 1
        ) as niches,
        (
          SELECT COUNT(*) 
          FROM ${websites} 
          WHERE ${websites.hasGuestPost} = true 
          AND ${websites.status} = 'Active'
        ) as total_sites,
        (
          SELECT 
            MIN(CAST(${websites.guestPostCost} AS NUMERIC))::INTEGER
          FROM ${websites} 
          WHERE ${websites.hasGuestPost} = true 
          AND ${websites.status} = 'Active'
          AND ${websites.guestPostCost} IS NOT NULL
        ) as min_price,
        (
          SELECT 
            MAX(CAST(${websites.guestPostCost} AS NUMERIC))::INTEGER
          FROM ${websites} 
          WHERE ${websites.hasGuestPost} = true 
          AND ${websites.status} = 'Active'
          AND ${websites.guestPostCost} IS NOT NULL
        ) as max_price,
        (
          SELECT 
            MIN(${websites.domainRating})
          FROM ${websites} 
          WHERE ${websites.hasGuestPost} = true 
          AND ${websites.status} = 'Active'
          AND ${websites.domainRating} IS NOT NULL
        ) as min_dr,
        (
          SELECT 
            MAX(${websites.domainRating})
          FROM ${websites} 
          WHERE ${websites.hasGuestPost} = true 
          AND ${websites.status} = 'Active'
          AND ${websites.domainRating} IS NOT NULL
        ) as max_dr,
        (
          SELECT 
            MAX(${websites.totalTraffic})
          FROM ${websites} 
          WHERE ${websites.hasGuestPost} = true 
          AND ${websites.status} = 'Active'
          AND ${websites.totalTraffic} IS NOT NULL
        ) as max_traffic
    `);

    const data = result.rows[0] as any;
    
    // Clean up and format the response
    return NextResponse.json({
      categories: data.categories || [],
      websiteTypes: data.website_types || [],
      niches: data.niches || [],
      stats: {
        totalSites: parseInt(data.total_sites) || 0,
        priceRange: {
          min: data.min_price ? Math.round(data.min_price * 100) : 0, // Convert to cents
          max: data.max_price ? Math.round(data.max_price * 100) : 0
        },
        drRange: {
          min: data.min_dr || 0,
          max: data.max_dr || 100
        },
        maxTraffic: data.max_traffic || 0
      }
    });

  } catch (error) {
    console.error('Error fetching website filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}