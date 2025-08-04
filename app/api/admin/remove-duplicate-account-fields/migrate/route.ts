import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting duplicate account fields removal migration...');

    // First check which columns exist
    const columnsQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      AND column_name IN ('account_email', 'account_name', 'account_company')
    `);

    const existingColumns = Array.isArray(columnsQuery) ? 
      columnsQuery.map((row: any) => row.column_name) : 
      (columnsQuery as any).rows?.map((row: any) => row.column_name) || [];
    
    if (existingColumns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All duplicate columns have already been removed',
        droppedColumns: []
      });
    }

    console.log(`Found columns to drop: ${existingColumns.join(', ')}`);

    // Safety check: Verify all orders have valid account references
    const orphanedOrdersQuery = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM orders o
      LEFT JOIN accounts a ON o.account_id = a.id
      WHERE o.account_id IS NOT NULL AND a.id IS NULL
    `);
    const orphanedOrders = parseInt((orphanedOrdersQuery as any)[0]?.count || '0');

    if (orphanedOrders > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot proceed: ${orphanedOrders} orders have invalid account_id references`
      }, { status: 400 });
    }

    const droppedColumns: string[] = [];

    // Drop each column that exists
    for (const columnName of existingColumns) {
      try {
        console.log(`Dropping column: ${columnName}`);
        await db.execute(sql`ALTER TABLE orders DROP COLUMN IF EXISTS ${sql.identifier(columnName)}`);
        droppedColumns.push(columnName);
        console.log(`Successfully dropped column: ${columnName}`);
      } catch (error: any) {
        console.error(`Error dropping column ${columnName}:`, error);
        return NextResponse.json({
          success: false,
          error: `Failed to drop column ${columnName}: ${error.message}`,
          droppedColumns
        }, { status: 500 });
      }
    }

    // Verify columns were dropped
    const verificationQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      AND column_name IN ('account_email', 'account_name', 'account_company')
    `);

    const remainingColumns = Array.isArray(verificationQuery) ? 
      verificationQuery.map((row: any) => row.column_name) : 
      (verificationQuery as any).rows?.map((row: any) => row.column_name) || [];
    
    if (remainingColumns.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Some columns still exist after drop: ${remainingColumns.join(', ')}`,
        droppedColumns
      }, { status: 500 });
    }

    console.log('Migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Successfully removed duplicate account fields from orders table',
      droppedColumns
    });

  } catch (error: any) {
    console.error('Error during migration:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error.message
    }, { status: 500 });
  }
}