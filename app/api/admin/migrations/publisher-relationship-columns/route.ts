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
    const migrationPath = path.join(process.cwd(), 'migrations', '0038_add_missing_publisher_columns_production.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        error: 'Migration file not found',
        path: migrationPath 
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    // Verify columns were added
    const columns = await db.execute(sql`
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

    return NextResponse.json({
      success: true,
      message: 'Publisher relationship columns migration completed successfully',
      columnsAdded: columns.rows.map((r: any) => r.column_name),
      details: {
        columnsAdded: columns.rows.length,
        expectedColumns: 4
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