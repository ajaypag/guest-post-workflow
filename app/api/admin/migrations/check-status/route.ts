import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const status: Record<string, boolean> = {};

    // Check if migration_history table exists
    const migrationTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migration_history'
      )
    `);
    
    status.create_migration_history = !!(migrationTableExists.rows[0]?.exists);

    // Check if publisher offerings system tables exist
    const publisherTables = await db.execute(sql`
      SELECT table_name 
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
    status.publisher_offerings_system = publisherTables.rows.length >= 6;

    // Check if publisher_offering_relationships has the required columns
    const relationshipColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'publisher_offering_relationships' 
      AND column_name IN (
        'relationship_type',
        'verification_status',
        'priority_rank',
        'is_preferred'
      )
    `);
    status.publisher_relationship_columns = relationshipColumns.rows.length === 4;

    // Check if websites table has publisher columns
    const websiteColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND column_name IN (
        'publisher_tier',
        'preferred_content_types',
        'typical_turnaround_days',
        'internal_quality_score'
      )
    `);
    status.website_publisher_columns = websiteColumns.rows.length >= 4;

    // Check if publisher_offerings has currency and availability columns
    const offeringColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'publisher_offerings' 
      AND column_name IN ('currency', 'current_availability')
    `);
    status.publisher_offering_columns = offeringColumns.rows.length === 2;

    // Check if publisher_performance has the required columns
    const performanceColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'publisher_performance' 
      AND column_name IN (
        'content_approval_rate',
        'revision_rate',
        'total_revenue',
        'avg_order_value',
        'last_calculated_at'
      )
    `);
    status.publisher_performance_columns = performanceColumns.rows.length === 5;

    // Check if offering_id is nullable in publisher_offering_relationships
    const offeringIdNullable = await db.execute(sql`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'publisher_offering_relationships' 
      AND column_name = 'offering_id'
    `);
    status.fix_offering_id_nullable = offeringIdNullable.rows[0]?.is_nullable === 'YES';

    // Check if publisher_offering_relationships has contact fields
    const contactFields = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'publisher_offering_relationships' 
      AND column_name IN (
        'verification_method',
        'contact_email',
        'contact_phone',
        'contact_name',
        'internal_notes',
        'publisher_notes',
        'commission_rate',
        'payment_terms'
      )
    `);
    status.add_missing_relationship_fields = contactFields.rows.length === 8;

    // Check if airtable_id is nullable in websites
    const airtableIdNullable = await db.execute(sql`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND column_name = 'airtable_id'
    `);
    status.make_airtable_id_nullable = airtableIdNullable.rows[0]?.is_nullable === 'YES';

    // Check if websites has normalized_domain column
    const normalizedDomainExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND column_name = 'normalized_domain'
    `);
    status.domain_normalization = normalizedDomainExists.rows.length > 0;

    // Check if order_line_items has publisher fields
    const orderPublisherFields = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_line_items' 
      AND column_name IN (
        'publisher_id',
        'publisher_offering_id',
        'publisher_status',
        'publisher_price',
        'platform_fee'
      )
    `);
    status.add_publisher_fields = orderPublisherFields.rows.length >= 5;

    // Check if publisher earnings and payment tables exist
    const earningsTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'publisher_earnings',
        'publisher_payment_batches',
        'commission_configurations',
        'publisher_order_analytics'
      )
    `);
    status.connect_orders_to_publishers = earningsTables.rows.length >= 4;

    // Check if publisher payment info tables exist
    const paymentTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'publisher_payment_info',
        'publisher_invoices'
      )
    `);
    status.publisher_payments_system = paymentTables.rows.length >= 2;

    // Now update with migration_history if it exists
    if (migrationTableExists.rows[0]?.exists) {
      const completedMigrations = await db.execute(sql`
        SELECT migration_name 
        FROM migration_history 
        WHERE success = true
      `);
      
      // If a migration is recorded as complete in history, trust that over database check
      for (const row of completedMigrations.rows) {
        const migrationName = row.migration_name as string;
        
        switch(migrationName) {
          case '0000_create_migrations_table':
            status.create_migration_history = true;
            break;
          case '0035_publisher_offerings_system_fixed':
            status.publisher_offerings_system = true;
            break;
          case '0036_publisher_earnings_system':
            status.publisher_earnings_system = true;
            break;
          case '0037_normalize_existing_domains':
            status.domain_normalization = true;
            break;
          case '0038_publisher_relations_and_permissions':
            status.publisher_relationship_columns = true;
            break;
          case '0039_website_publisher_columns':
            status.website_publisher_columns = true;
            break;
          case '0040_add_missing_publisher_offering_columns':
            status.publisher_offering_columns = true;
            break;
          case '0041_add_missing_performance_columns':
            status.publisher_performance_columns = true;
            break;
          case '0042_fix_offering_id_nullable':
            status.fix_offering_id_nullable = true;
            break;
          case '0043_add_missing_relationship_fields':
            status.add_missing_relationship_fields = true;
            break;
          case '0044_make_airtable_id_nullable':
            status.make_airtable_id_nullable = true;
            break;
          case '0040_add_publisher_fields':
            status.add_publisher_fields = true;
            break;
          case '0050_connect_orders_to_publishers':
            status.connect_orders_to_publishers = true;
            break;
          case '0051_publisher_payments_system':
            status.publisher_payments_system = true;
            break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Status check failed',
      status: {}
    }, { status: 500 });
  }
}