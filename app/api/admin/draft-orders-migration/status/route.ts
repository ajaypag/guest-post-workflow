import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders, users } from '@/lib/db/schema';
import { eq, and, ne, isNotNull } from 'drizzle-orm';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if system user exists
    const systemUser = await db.query.users.findFirst({
      where: eq(users.id, SYSTEM_USER_ID)
    });

    // Get all draft orders
    const allDraftOrders = await db.query.orders.findMany({
      where: eq(orders.status, 'draft'),
      orderBy: (orders, { desc }) => [desc(orders.updatedAt)]
    });

    // Filter draft orders created by account users (have accountId but createdBy is not SYSTEM_USER_ID)
    const accountDraftOrders = allDraftOrders.filter(order => 
      order.accountId && order.createdBy !== SYSTEM_USER_ID
    );

    // Count how many need migration (have accountId but wrong createdBy)
    const needsMigration = accountDraftOrders.filter(order => 
      order.createdBy !== SYSTEM_USER_ID
    ).length;

    return NextResponse.json({
      status: {
        systemUserExists: !!systemUser,
        totalDraftOrders: allDraftOrders.length,
        accountDraftOrders: accountDraftOrders.length,
        needsMigration,
        migrationErrors: [],
        migratedCount: 0
      },
      draftOrders: accountDraftOrders.map(order => ({
        id: order.id,
        accountId: order.accountId,
        createdBy: order.createdBy,
        status: order.status,
        updatedAt: order.updatedAt
      }))
    });

  } catch (error: any) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({
      error: 'Failed to check migration status',
      details: error.message
    }, { status: 500 });
  }
}