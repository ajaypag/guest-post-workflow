import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if websites table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'websites'
      )
    `);
    
    const exists = tableCheck.rows[0]?.exists;
    
    if (!exists) {
      return NextResponse.json({
        exists: false,
        error: 'websites table does not exist'
      });
    }
    
    // Get column information
    const columns = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'websites'
      ORDER BY ordinal_position
    `);
    
    // Get various counts
    const counts = await db.execute(sql`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN overall_quality IN ('Excellent', 'Good', 'Fair') THEN 1 END) as quality_count,
        COUNT(CASE WHEN categories IS NOT NULL AND categories != '{}' THEN 1 END) as with_categories,
        COUNT(CASE WHEN domain_rating IS NOT NULL THEN 1 END) as with_domain_rating,
        COUNT(CASE WHEN total_traffic IS NOT NULL THEN 1 END) as with_traffic
      FROM websites
    `);
    
    // Get sample data
    const samples = await db.execute(sql`
      SELECT 
        id,
        domain,
        domain_rating,
        total_traffic,
        guest_post_cost,
        categories,
        type,
        status,
        has_guest_post,
        has_link_insert,
        overall_quality,
        created_at
      FROM websites
      WHERE domain_rating IS NOT NULL
      ORDER BY domain_rating DESC
      LIMIT 10
    `);
    
    // Check for specific domains mentioned by user
    const specificDomains = await db.execute(sql`
      SELECT domain, domain_rating, categories, overall_quality
      FROM websites
      WHERE domain IN ('themerex.net', 'coinlib.io', 'houzz.co.uk', 'codesupply.co')
    `);
    
    return NextResponse.json({
      exists: true,
      totalCount: parseInt(counts.rows[0]?.total_count || '0'),
      qualityCount: parseInt(counts.rows[0]?.quality_count || '0'),
      withCategories: parseInt(counts.rows[0]?.with_categories || '0'),
      withDomainRating: parseInt(counts.rows[0]?.with_domain_rating || '0'),
      withTraffic: parseInt(counts.rows[0]?.with_traffic || '0'),
      columns: columns.rows,
      sampleData: samples.rows,
      specificDomains: specificDomains.rows,
      columnCount: columns.rows.length,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      exists: false,
      error: error.message,
      stack: error.stack,
      code: error.code,
    });
  }
}