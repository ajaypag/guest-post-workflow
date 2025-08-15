import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const status: Record<string, boolean> = {};

    // Check if publisher offerings system tables exist
    const publisherTables = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'publisher_offerings',
        'publisher_offering_relationships',
        'publisher_pricing_rules',
        'publisher_performance',
        'publisher_payouts',
        'publisher_email_claims'
      )
    `);
    status.publisher_offerings_system = Number(publisherTables.rows[0]?.count || 0) >= 6;

    // Check if relationship columns exist
    const relationshipColumns = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'publisher_offering_relationships' 
      AND column_name IN (
        'relationship_type',
        'verification_status',
        'priority_rank',
        'is_preferred'
      )
    `);
    status.publisher_relationship_columns = Number(relationshipColumns.rows[0]?.count || 0) === 4;

    // Check if website columns exist
    const websiteColumns = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND column_name IN (
        'publisher_tier',
        'preferred_content_types',
        'editorial_calendar_url',
        'content_guidelines_url',
        'typical_turnaround_days',
        'accepts_do_follow',
        'requires_author_bio',
        'max_links_per_post',
        'primary_contact_id',
        'publisher_company',
        'website_language',
        'target_audience',
        'avg_response_time_hours',
        'success_rate_percentage',
        'last_campaign_date',
        'total_posts_published',
        'internal_quality_score',
        'internal_notes',
        'account_manager_id',
        'organization_id'
      )
    `);
    status.website_publisher_columns = Number(websiteColumns.rows[0]?.count || 0) >= 15; // Allow some flexibility

    // Check if publisher offering columns exist
    const offeringColumns = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'publisher_offerings' 
      AND column_name IN ('currency', 'current_availability')
    `);
    status.publisher_offering_columns = Number(offeringColumns.rows[0]?.count || 0) >= 2;

    // Check if publisher performance columns exist
    const performanceColumns = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'publisher_performance' 
      AND column_name IN ('content_approval_rate', 'revision_rate', 'total_revenue', 'avg_order_value', 'last_calculated_at')
    `);
    status.publisher_performance_columns = Number(performanceColumns.rows[0]?.count || 0) === 5;

    // Check if domain normalization is done
    const normalizedCheck = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(normalized_domain) as normalized
      FROM websites
    `);
    const total = Number(normalizedCheck.rows[0]?.total || 0);
    const normalized = Number(normalizedCheck.rows[0]?.normalized || 0);
    status.domain_normalization = total > 0 && normalized === total;

    // Check if all migrations are complete
    status.run_all_publisher_migrations = 
      status.publisher_offerings_system && 
      status.publisher_relationship_columns && 
      status.website_publisher_columns && 
      status.publisher_offering_columns &&
      status.publisher_performance_columns &&
      status.domain_normalization;

    return NextResponse.json({
      success: true,
      status,
      details: {
        publisherTables: Number(publisherTables.rows[0]?.count || 0),
        relationshipColumns: Number(relationshipColumns.rows[0]?.count || 0),
        websiteColumns: Number(websiteColumns.rows[0]?.count || 0),
        offeringColumns: Number(offeringColumns.rows[0]?.count || 0),
        performanceColumns: Number(performanceColumns.rows[0]?.count || 0),
        totalDomains: total,
        normalizedDomains: normalized
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Status check failed',
      status: {}
    }, { status: 500 });
  }
}