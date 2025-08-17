import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  // Allow unauthenticated access for emergency schema check
  try {
    // Check what publisher tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'publisher%'
      ORDER BY table_name
    `);
    
    // Check migration history
    const migrations = await db.execute(sql`
      SELECT name, executed_at 
      FROM drizzle_migrations 
      WHERE name LIKE '%publisher%'
      ORDER BY executed_at DESC
      LIMIT 10
    `);
    
    // Check specific tables
    const checks = {
      publisher_offerings: false,
      publisher_offering_relationships: false,
      publisher_websites: false,
      publishers: false,
      publisher_performance: false,
      publisher_earnings: false,
      publisher_invoices: false,
    };
    
    for (const tableName of Object.keys(checks)) {
      try {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
        checks[tableName] = { 
          exists: true, 
          count: result.rows[0].count 
        };
      } catch (e) {
        checks[tableName] = { 
          exists: false, 
          error: e.message 
        };
      }
    }
    
    // Check for conflicting columns
    let schemaIssues = [];
    
    // Check publisher_offerings structure if it exists
    if (checks.publisher_offerings.exists) {
      const offeringsColumns = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'publisher_offerings'
        ORDER BY ordinal_position
      `);
      
      // Check for problematic columns
      const hasPublisherId = offeringsColumns.rows.some(c => c.column_name === 'publisher_id');
      const hasPublisherWebsiteId = offeringsColumns.rows.some(c => c.column_name === 'publisher_website_id');
      const hasPublisherRelationshipId = offeringsColumns.rows.some(c => c.column_name === 'publisher_relationship_id');
      const hasOfferingName = offeringsColumns.rows.some(c => c.column_name === 'offering_name');
      
      schemaIssues.push({
        table: 'publisher_offerings',
        has_publisher_id: hasPublisherId,
        has_publisher_website_id: hasPublisherWebsiteId,
        has_publisher_relationship_id: hasPublisherRelationshipId,
        has_offering_name: hasOfferingName,
        total_columns: offeringsColumns.rows.length
      });
    }
    
    return NextResponse.json({
      tables: tables.rows.map(r => r.table_name),
      migrations: migrations.rows,
      tableChecks: checks,
      schemaIssues,
      summary: {
        total_tables: tables.rows.length,
        schema_version: migrations.rows[0]?.name || 'unknown'
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}