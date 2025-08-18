import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { execute } = await request.json();
    
    if (!execute) {
      return NextResponse.json({ error: 'Execute flag not set' }, { status: 400 });
    }

    const results = {
      publisher_offerings_system: { success: false, message: '' },
      publisher_relationship_columns: { success: false, message: '' },
      website_publisher_columns: { success: false, message: '' },
      domain_normalization: { success: false, message: '' }
    };

    // Migration 1: Publisher Offerings System
    try {
      const migration1Path = path.join(process.cwd(), 'migrations', '0035_publisher_offerings_system_fixed_v2.sql');
      if (fs.existsSync(migration1Path)) {
        const migration1SQL = fs.readFileSync(migration1Path, 'utf8');
        await db.execute(sql.raw(migration1SQL));
        results.publisher_offerings_system = { success: true, message: 'Publisher offerings system created' };
      }
    } catch (error) {
      results.publisher_offerings_system = { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed' 
      };
    }

    // Migration 2: Publisher Relationship Columns
    try {
      const migration2Path = path.join(process.cwd(), 'migrations', '0038_add_missing_publisher_columns_production.sql');
      if (fs.existsSync(migration2Path)) {
        const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
        await db.execute(sql.raw(migration2SQL));
        results.publisher_relationship_columns = { success: true, message: 'Relationship columns added' };
      }
    } catch (error) {
      results.publisher_relationship_columns = { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed' 
      };
    }

    // Migration 3: Website Publisher Columns
    try {
      const migration3Path = path.join(process.cwd(), 'migrations', '0039_add_missing_website_columns.sql');
      if (fs.existsSync(migration3Path)) {
        const migration3SQL = fs.readFileSync(migration3Path, 'utf8');
        await db.execute(sql.raw(migration3SQL));
        results.website_publisher_columns = { success: true, message: 'Website columns added' };
      }
    } catch (error) {
      results.website_publisher_columns = { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed' 
      };
    }

    // Migration 4: Domain Normalization
    try {
      const migration4Path = path.join(process.cwd(), 'migrations', '0037_normalize_existing_domains.sql');
      if (fs.existsSync(migration4Path)) {
        const migration4SQL = fs.readFileSync(migration4Path, 'utf8');
        await db.execute(sql.raw(migration4SQL));
        results.domain_normalization = { success: true, message: 'Domains normalized' };
      }
    } catch (error) {
      results.domain_normalization = { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed' 
      };
    }

    // Check overall success
    const allSuccess = Object.values(results).every(r => r.success);

    if (allSuccess) {
      // Verify the setup
      const tables = await db.execute(sql`
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

      const websiteColumns = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = 'websites' 
        AND column_name = 'publisher_tier'
      `);

      const normalizedDomains = await db.execute(sql`
        SELECT COUNT(*) as total, COUNT(normalized_domain) as normalized 
        FROM websites
      `);

      return NextResponse.json({
        success: true,
        message: 'All publisher migrations completed successfully',
        results,
        verification: {
          publisherTables: tables.rows[0]?.count || 0,
          websiteColumnsAdded: websiteColumns.rows[0]?.count || 0,
          domainsNormalized: normalizedDomains.rows[0]?.normalized || 0,
          totalDomains: normalizedDomains.rows[0]?.total || 0
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Some migrations failed',
        results
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Migration failed',
      details: error
    }, { status: 500 });
  }
}