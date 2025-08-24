import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import fs from 'fs';
import path from 'path';

// Migration status storage (in production, use Redis or database)
let migrationState = {
  phase: 'pre-migration' as 'pre-migration' | 'in-progress' | 'completed' | 'failed' | 'rolled-back',
  currentStep: 'Ready to start',
  progress: 0,
  ordersMigrated: 0,
  totalOrders: 0,
  lineItemsCreated: 0,
  errors: [] as string[],
  startedAt: null as string | null,
  completedAt: null as string | null,
  backupCreated: false,
  canRollback: false,
  details: {} as Record<string, any>
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only internal admin users
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current migration status from database analysis
    const migrationStatus = await analyzeMigrationStatus();
    
    // Merge with stored state
    const fullStatus = {
      ...migrationState,
      ...migrationStatus
    };

    return NextResponse.json(fullStatus);
  } catch (error: any) {
    console.error('Error getting migration status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get migration status' },
      { status: 500 }
    );
  }
}

async function analyzeMigrationStatus() {
  const details: Record<string, any> = {};
  
  try {
    // Count total orders
    const totalOrdersResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(orders);
    const totalOrders = totalOrdersResult[0]?.count || 0;

    // Count orders with line items
    const ordersWithLineItemsResult = await db
      .select({ 
        orderId: orderLineItems.orderId,
        count: sql<number>`cast(count(*) as int)`
      })
      .from(orderLineItems)
      .groupBy(orderLineItems.orderId);
    const ordersMigrated = ordersWithLineItemsResult.length;

    // Count total line items
    const totalLineItemsResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(orderLineItems);
    const lineItemsCreated = totalLineItemsResult[0]?.count || 0;

    // Count orders with order groups (legacy system)
    const ordersWithGroupsResult = await db
      .select({ 
        orderId: orderGroups.orderId,
        count: sql<number>`cast(count(*) as int)`
      })
      .from(orderGroups)
      .groupBy(orderGroups.orderId);
    const ordersWithGroups = ordersWithGroupsResult.length;

    // No backup checking - removed backup functionality
    const backupCreated = false;

    // Determine migration phase based on data
    let phase: 'pre-migration' | 'in-progress' | 'completed' | 'failed' | 'rolled-back' = 'pre-migration';
    let progress = 0;
    let currentStep = 'Ready to start';
    let canRollback = false;

    if (ordersMigrated > 0 && ordersMigrated === totalOrders && ordersWithGroups === 0) {
      phase = 'completed';
      progress = 100;
      currentStep = 'Migration completed successfully';
      canRollback = backupCreated;
    } else if (ordersMigrated > 0) {
      phase = 'in-progress';
      progress = totalOrders > 0 ? Math.round((ordersMigrated / totalOrders) * 100) : 0;
      currentStep = `Migrating orders (${ordersMigrated}/${totalOrders})`;
      canRollback = backupCreated;
    } else if (backupCreated) {
      phase = 'pre-migration';
      progress = 10;
      currentStep = 'Backup created, ready to migrate';
      canRollback = true;
    }

    // Check migration history
    try {
      const migrationHistory = await db.execute(sql`
        SELECT name, applied_at 
        FROM migrations 
        WHERE name LIKE '%lineitem%' OR name LIKE '%0056%'
        ORDER BY applied_at DESC
      `);
      details.migrationHistory = migrationHistory.rows;
    } catch (error) {
      details.migrationHistory = [];
    }

    // Get detailed counts
    details.orderBreakdown = {
      total: totalOrders,
      withLineItems: ordersMigrated,
      withGroups: ordersWithGroups,
      needsMigration: Math.max(0, ordersWithGroups - ordersMigrated)
    };

    return {
      phase,
      currentStep,
      progress,
      ordersMigrated,
      totalOrders,
      lineItemsCreated,
      backupCreated,
      canRollback,
      details
    };
  } catch (error) {
    console.error('Error analyzing migration status:', error);
    return {
      phase: 'failed' as const,
      currentStep: 'Error analyzing migration status',
      progress: 0,
      ordersMigrated: 0,
      totalOrders: 0,
      lineItemsCreated: 0,
      backupCreated: false,
      canRollback: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// Function to update migration state (called by execution endpoints)
export function updateMigrationState(updates: Partial<typeof migrationState>) {
  migrationState = { ...migrationState, ...updates };
}

// Function to get current migration state (used by execution endpoints)
export function getMigrationState() {
  return migrationState;
}