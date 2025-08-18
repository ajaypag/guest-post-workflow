import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.execute) {
      return NextResponse.json({
        message: 'This will add missing currency and currentAvailability columns to publisher_offerings table',
        preview: true,
        sqlFile: 'migrations/0040_add_missing_publisher_offering_columns.sql'
      });
    }

    // Read and execute the SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '0040_add_missing_publisher_offering_columns.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found: 0040_add_missing_publisher_offering_columns.sql');
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    // Verify the columns were added
    const currencyCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'publisher_offerings' 
      AND column_name = 'currency'
    `);

    const availabilityCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'publisher_offerings' 
      AND column_name = 'current_availability'
    `);

    const columnsAdded = {
      currency: currencyCheck.rows.length > 0,
      current_availability: availabilityCheck.rows.length > 0
    };

    return NextResponse.json({
      success: true,
      message: 'Publisher offering columns migration completed successfully',
      details: {
        migrationFile: '0040_add_missing_publisher_offering_columns.sql',
        columnsAdded,
        summary: 'Added currency and current_availability columns to publisher_offerings table'
      }
    });

  } catch (error) {
    console.error('Publisher offering columns migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed',
      details: {
        migrationFile: '0040_add_missing_publisher_offering_columns.sql',
        step: 'Adding publisher offering columns'
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Publisher Offering Columns Migration',
    description: 'Adds missing currency and currentAvailability columns to publisher_offerings table',
    sqlFile: '0040_add_missing_publisher_offering_columns.sql',
    status: 'ready'
  });
}