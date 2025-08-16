import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { execute } = body;

    if (!execute) {
      return NextResponse.json({ 
        error: 'This endpoint requires execute: true in the request body' 
      }, { status: 400 });
    }

    // Read the SQL migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '0050_connect_orders_to_publishers.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        error: 'Migration file not found: 0050_connect_orders_to_publishers.sql' 
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    return NextResponse.json({
      success: true,
      message: 'Connect Orders to Publishers migration completed successfully',
      details: {
        migration: '0050_connect_orders_to_publishers.sql',
        description: 'Order-to-publisher connection system with status tracking created',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Connect Orders to Publishers migration failed:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if migration has been applied by checking for the existence of key columns
    const checkSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_line_items' 
      AND column_name IN ('publisher_id', 'publisher_status', 'publisher_price', 'publisher_accepted_at')
    `;
    
    const result = await db.execute(sql.raw(checkSQL));
    const hasRequiredColumns = result.rows.length >= 4;

    return NextResponse.json({
      applied: hasRequiredColumns,
      details: {
        migration: '0050_connect_orders_to_publishers.sql',
        description: 'Checks if order-to-publisher connection columns exist',
        columnsFound: result.rows.length,
        requiredColumns: 4
      }
    });

  } catch (error) {
    console.error('Error checking Connect Orders to Publishers migration status:', error);
    return NextResponse.json({
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}