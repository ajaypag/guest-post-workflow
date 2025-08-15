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

    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '0035_publisher_offerings_system_fixed_v2.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        error: 'Migration file not found',
        path: migrationPath 
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    // Verify tables were created
    const tables = await db.execute(sql`
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

    return NextResponse.json({
      success: true,
      message: 'Publisher offerings system migration completed successfully',
      tablesCreated: tables.rows.map((r: any) => r.table_name),
      details: {
        tablesCreated: tables.rows.length,
        expectedTables: 6
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Migration failed',
      details: error
    }, { status: 500 });
  }
}