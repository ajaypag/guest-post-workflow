import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only internal users can check migrations
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can check migrations' }, { status: 403 });
    }

    // Check if each required table exists
    const tables = [
      'stripe_payment_intents',
      'stripe_customers', 
      'stripe_webhooks'
    ];

    const tableStatus: Record<string, boolean> = {};
    
    for (const tableName of tables) {
      try {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          ) as exists
        `);
        
        tableStatus[tableName] = result.rows[0]?.exists === true;
      } catch (error) {
        console.error(`Error checking table ${tableName}:`, error);
        tableStatus[tableName] = false;
      }
    }

    // Also check for indexes
    const indexes = [
      'idx_stripe_payment_intents_order_id',
      'idx_stripe_payment_intents_stripe_id',
      'idx_stripe_customers_account',
      'idx_stripe_webhooks_event_id'
    ];

    const indexStatus: Record<string, boolean> = {};
    
    for (const indexName of indexes) {
      try {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname = ${indexName}
          ) as exists
        `);
        
        indexStatus[indexName] = result.rows[0]?.exists === true;
      } catch (error) {
        console.error(`Error checking index ${indexName}:`, error);
        indexStatus[indexName] = false;
      }
    }

    return NextResponse.json({
      success: true,
      tables: tableStatus,
      indexes: indexStatus,
      allTablesExist: Object.values(tableStatus).every(exists => exists),
      allIndexesExist: Object.values(indexStatus).every(exists => exists)
    });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status', details: error },
      { status: 500 }
    );
  }
}