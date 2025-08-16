import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const status: Record<string, boolean> = {};

    // First check if migration_history table exists
    const migrationTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migration_history'
      )
    `);
    
    if (migrationTableExists.rows[0]?.exists) {
      // Get all completed migrations from history
      const completedMigrations = await db.execute(sql`
        SELECT migration_name 
        FROM migration_history 
        WHERE success = true
      `);
      
      // Mark migrations as completed based on history
      for (const row of completedMigrations.rows) {
        const migrationName = row.migration_name as string;
        
        // Map database migration names to frontend IDs
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
            status.publisher_relations_permissions = true;
            break;
          case '0040_add_publisher_fields':
            status.add_publisher_fields = true;
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
          case '0050_connect_orders_to_publishers':
            status.connect_orders_to_publishers = true;
            break;
          case '0051_publisher_payments_system':
            status.publisher_payments_system = true;
            break;
        }
      }
    } else {
      // Migration history table doesn't exist
      status.create_migration_history = false;
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