import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders, users } from '@/lib/db/schema';
import { eq, and, ne, isNotNull } from 'drizzle-orm';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if system user exists
    const systemUser = await db.query.users.findFirst({
      where: eq(users.id, SYSTEM_USER_ID)
    });

    if (!systemUser) {
      return NextResponse.json({ 
        error: 'System user does not exist. Please create it first.' 
      }, { status: 400 });
    }

    // Get all draft orders that need migration
    const draftOrdersToMigrate = await db.query.orders.findMany({
      where: and(
        eq(orders.status, 'draft'),
        isNotNull(orders.accountId),
        ne(orders.createdBy, SYSTEM_USER_ID)
      )
    });

    console.log(`Found ${draftOrdersToMigrate.length} draft orders to migrate`);

    let migratedCount = 0;
    const errors: string[] = [];

    // Migrate each order
    for (const order of draftOrdersToMigrate) {
      try {
        await db
          .update(orders)
          .set({
            createdBy: SYSTEM_USER_ID,
            updatedAt: new Date()
          })
          .where(eq(orders.id, order.id));
        
        migratedCount++;
        console.log(`Migrated order ${order.id} for account ${order.accountId}`);
      } catch (error: any) {
        const errorMsg = `Failed to migrate order ${order.id}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Migration completed: ${migratedCount}/${draftOrdersToMigrate.length} orders migrated`);

    return NextResponse.json({
      success: true,
      migratedCount,
      totalProcessed: draftOrdersToMigrate.length,
      errors
    });

  } catch (error: any) {
    console.error('Error during migration:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message
    }, { status: 500 });
  }
}