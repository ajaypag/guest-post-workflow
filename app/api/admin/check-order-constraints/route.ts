import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check all foreign key constraints on orders table
    const constraintsResult = await db.execute(sql`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'orders'
        AND tc.table_schema = 'public'
      ORDER BY tc.constraint_name;
    `);

    // Check if system user exists
    const systemUserResult = await db.execute(sql`
      SELECT id FROM users 
      WHERE id = '00000000-0000-0000-0000-000000000000'
    `);

    // Check accounts table
    const accountCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM accounts
    `);

    // Check if there are any orders with account_id
    const ordersWithAccountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM orders WHERE account_id IS NOT NULL
    `);

    return NextResponse.json({
      constraints: constraintsResult.rows as any[],
      systemUserExists: systemUserResult.rows.length > 0,
      accountCount: parseInt((accountCountResult.rows[0] as any)?.count || '0'),
      ordersWithAccount: parseInt((ordersWithAccountResult.rows[0] as any)?.count || '0'),
    });

  } catch (error) {
    console.error('Error checking constraints:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check constraints' },
      { status: 500 }
    );
  }
}