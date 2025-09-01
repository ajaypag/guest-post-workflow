import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.role === 'admin' || (session as any).role === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch websites with all their offerings
    const result = await db.execute(sql`
      WITH website_offerings AS (
        SELECT 
          w.id as website_id,
          w.domain,
          w.guest_post_cost,
          w.pricing_strategy,
          w.custom_offering_id,
          w.guest_post_cost_source,
          po.id as offering_id,
          po.offering_name,
          po.base_price as offering_price,
          p.id as publisher_id,
          p.company_name as publisher_name,
          p.email as publisher_email
        FROM websites w
        LEFT JOIN publisher_offering_relationships por ON por.website_id = w.id
        LEFT JOIN publisher_offerings po ON po.id = por.offering_id
        LEFT JOIN publishers p ON p.id = po.publisher_id
        WHERE po.is_active = true 
          AND po.offering_type = 'guest_post'
          AND w.guest_post_cost IS NOT NULL
        ORDER BY w.domain, po.base_price
      ),
      website_with_price_range AS (
        SELECT 
          website_id,
          MIN(offering_price) as min_price,
          MAX(offering_price) as max_price
        FROM website_offerings
        GROUP BY website_id
      ),
      website_summary AS (
        SELECT 
          wo.website_id,
          wo.domain,
          wo.guest_post_cost,
          wo.pricing_strategy,
          wo.custom_offering_id,
          wo.guest_post_cost_source,
          COUNT(DISTINCT wo.offering_id) as offering_count,
          wpr.min_price,
          wpr.max_price,
          json_agg(
            json_build_object(
              'id', wo.offering_id,
              'name', wo.offering_name,
              'price', wo.offering_price,
              'publisher_id', wo.publisher_id,
              'publisher_name', wo.publisher_name,
              'publisher_email', wo.publisher_email,
              'is_selected', CASE 
                WHEN wo.custom_offering_id = wo.offering_id THEN true
                WHEN wo.pricing_strategy = 'min_price' AND wo.offering_price = wpr.min_price THEN true
                WHEN wo.pricing_strategy = 'max_price' AND wo.offering_price = wpr.max_price THEN true
                ELSE false
              END
            ) ORDER BY wo.offering_price
          ) as offerings
        FROM website_offerings wo
        JOIN website_with_price_range wpr ON wpr.website_id = wo.website_id
        GROUP BY wo.website_id, wo.domain, wo.guest_post_cost, wo.pricing_strategy, wo.custom_offering_id, wo.guest_post_cost_source, wpr.min_price, wpr.max_price
      )
      SELECT * FROM website_summary
      ORDER BY 
        CASE 
          WHEN offering_count > 1 THEN 0 
          ELSE 1 
        END,
        offering_count DESC,
        domain
    `);

    const websites = result.rows.map((row: any) => ({
      id: row.website_id,
      domain: row.domain,
      guestPostCost: row.guest_post_cost,
      pricingStrategy: row.pricing_strategy,
      customOfferingId: row.custom_offering_id,
      guestPostCostSource: row.guest_post_cost_source,
      offeringCount: parseInt(row.offering_count),
      minPrice: row.min_price,
      maxPrice: row.max_price,
      priceRange: row.max_price - row.min_price,
      offerings: row.offerings || []
    }));

    // Calculate statistics
    const stats = {
      totalWebsites: websites.length,
      websitesWithMultipleOfferings: websites.filter(w => w.offeringCount > 1).length,
      strategyCounts: {
        min_price: websites.filter(w => w.pricingStrategy === 'min_price').length,
        max_price: websites.filter(w => w.pricingStrategy === 'max_price').length,
        custom: websites.filter(w => w.pricingStrategy === 'custom').length,
      },
      averageOfferingsPerWebsite: Math.round(
        websites.reduce((acc, w) => acc + w.offeringCount, 0) / websites.length * 10
      ) / 10
    };

    return NextResponse.json({
      websites,
      stats
    });

  } catch (error) {
    console.error('Error fetching websites with offerings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}