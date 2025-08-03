import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checks: string[] = [];
    const errors: string[] = [];

    // Check if duplicate columns exist
    const columnsQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      AND column_name IN ('account_email', 'account_name', 'account_company')
    `);

    const existingColumns = (columnsQuery as unknown as any[]).map((row: any) => row.column_name);
    const columnsExist = {
      accountEmail: existingColumns.includes('account_email'),
      accountName: existingColumns.includes('account_name'),
      accountCompany: existingColumns.includes('account_company')
    };

    if (!columnsExist.accountEmail && !columnsExist.accountName && !columnsExist.accountCompany) {
      checks.push('All duplicate columns have already been removed');
      return NextResponse.json({
        columnsExist,
        ordersWithDuplicateData: 0,
        migrationSafe: true,
        checks,
        errors
      });
    }

    // Count orders with duplicate data
    let ordersWithDuplicateData = 0;
    if (existingColumns.length > 0) {
      const countQuery = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM orders 
        WHERE account_id IS NOT NULL
        ${existingColumns.length > 0 ? sql`AND (${sql.join(existingColumns.map(col => sql`${sql.identifier(col)} IS NOT NULL`), sql` OR `)})` : sql``}
      `);
      ordersWithDuplicateData = parseInt((countQuery as any)[0]?.count || '0');
    }

    // Check that all orders have valid account references
    const orphanedOrdersQuery = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM orders o
      LEFT JOIN accounts a ON o.account_id = a.id
      WHERE o.account_id IS NOT NULL AND a.id IS NULL
    `);
    const orphanedOrders = parseInt((orphanedOrdersQuery as any)[0]?.count || '0');

    if (orphanedOrders > 0) {
      errors.push(`${orphanedOrders} orders have invalid account_id references`);
    } else {
      checks.push('All orders have valid account_id references');
    }

    // Check that accounts table exists and has required fields
    const accountsTableQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      AND table_schema = 'public'
      AND column_name IN ('id', 'email', 'contact_name', 'company_name')
    `);
    const accountsColumns = (accountsTableQuery as unknown as any[]).map((row: any) => row.column_name);
    
    if (accountsColumns.includes('id') && accountsColumns.includes('email')) {
      checks.push('Accounts table has required fields');
    } else {
      errors.push('Accounts table missing required fields');
    }

    // Check for any active code references (this would need to be done manually)
    checks.push('Code has been updated to use account relations (manual verification required)');

    const migrationSafe = errors.length === 0;

    if (migrationSafe) {
      checks.push('Migration is safe to proceed');
    }

    return NextResponse.json({
      columnsExist,
      ordersWithDuplicateData,
      migrationSafe,
      checks,
      errors
    });

  } catch (error: any) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({
      error: 'Failed to check migration status',
      details: error.message
    }, { status: 500 });
  }
}