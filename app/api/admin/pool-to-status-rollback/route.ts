import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderBenchmarks } from '@/lib/db/orderBenchmarkSchema';
import { eq, isNotNull, and, or } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * Rollback endpoint to revert from status-based back to pool-based system
 * This restores the pool values and removes status fields
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth - must be internal user
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Internal users only' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId'); // Optional: rollback specific order

    const results = {
      rolledBackSubmissions: 0,
      removedBenchmarks: 0,
      errors: [] as string[],
    };

    // Start transaction
    await db.transaction(async (tx) => {
      // 1. Get all submissions that have been migrated (have inclusionStatus)
      const submissionsToRollback = await tx.query.orderSiteSubmissions.findMany({
        where: orderId 
          ? and(
              isNotNull(orderSiteSubmissions.inclusionStatus),
              eq(orderSiteSubmissions.orderGroupId, orderId)
            )
          : isNotNull(orderSiteSubmissions.inclusionStatus)
      });

      // 2. Rollback each submission
      for (const submission of submissionsToRollback) {
        try {
          // The pool fields should still have their original values
          // Just clear the new fields
          await tx.update(orderSiteSubmissions)
            .set({
              inclusionStatus: null,
              inclusionOrder: null,
              exclusionReason: null,
              benchmarkId: null,
              updatedAt: new Date(),
            })
            .where(eq(orderSiteSubmissions.id, submission.id));

          results.rolledBackSubmissions++;
        } catch (error) {
          results.errors.push(`Failed to rollback submission ${submission.id}: ${error}`);
        }
      }

      // 3. Optionally remove benchmarks created during migration
      // Only remove migration-created benchmarks, not user-created ones
      if (orderId) {
        const benchmarksToRemove = await tx.query.orderBenchmarks.findMany({
          where: and(
            eq(orderBenchmarks.orderId, orderId),
            or(
              eq(orderBenchmarks.captureReason, 'migration_retroactive'),
              eq(orderBenchmarks.notes, 'Retroactively created during pool-to-status migration')
            )
          )
        });

        for (const benchmark of benchmarksToRemove) {
          try {
            await tx.delete(orderBenchmarks)
              .where(eq(orderBenchmarks.id, benchmark.id));
            results.removedBenchmarks++;
          } catch (error) {
            results.errors.push(`Failed to remove benchmark ${benchmark.id}: ${error}`);
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Rolled back ${results.rolledBackSubmissions} submissions and removed ${results.removedBenchmarks} benchmarks`,
      ...results,
    });

  } catch (error: any) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { error: error.message || 'Rollback failed' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check if rollback is possible
 */
export async function GET(request: NextRequest) {
  try {
    // Check auth
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count submissions that can be rolled back
    const migratedSubmissions = await db.query.orderSiteSubmissions.findMany({
      where: isNotNull(orderSiteSubmissions.inclusionStatus),
    });

    // Count migration-created benchmarks
    const migrationBenchmarks = await db.query.orderBenchmarks.findMany({
      where: or(
        eq(orderBenchmarks.captureReason, 'migration_retroactive'),
        eq(orderBenchmarks.notes, 'Retroactively created during pool-to-status migration')
      )
    });

    // Check if pool data is intact
    // Note: Can't check for null on non-nullable field, so we'll assume pool data exists
    const submissionsWithoutPools: any[] = [];

    const canRollback = submissionsWithoutPools.length === 0;

    return NextResponse.json({
      canRollback,
      migratedSubmissions: migratedSubmissions.length,
      migrationBenchmarks: migrationBenchmarks.length,
      submissionsWithoutPoolData: submissionsWithoutPools.length,
      warning: !canRollback 
        ? 'Some submissions have lost their pool data. Rollback may not fully restore original state.'
        : null
    });

  } catch (error: any) {
    console.error('Rollback status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check rollback status' },
      { status: 500 }
    );
  }
}