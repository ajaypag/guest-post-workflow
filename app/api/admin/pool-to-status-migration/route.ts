import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderBenchmarks } from '@/lib/db/orderBenchmarkSchema';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, isNull, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * Migration endpoint to convert from pool-based to status-based system
 * Maps: primary → included, alternative → saved_for_later
 * Creates retroactive benchmarks for existing orders
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth - must be internal user
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Internal users only' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const orderId = searchParams.get('orderId'); // Optional: migrate specific order

    const results = {
      migratedSubmissions: 0,
      createdBenchmarks: 0,
      errors: [] as string[],
      dryRun,
    };

    // Start transaction
    await db.transaction(async (tx) => {
      // 1. Get all submissions that need migration
      const submissionsToMigrate = await tx.query.orderSiteSubmissions.findMany({
        where: orderId 
          ? and(
              isNull(orderSiteSubmissions.inclusionStatus),
              eq(orderSiteSubmissions.orderGroupId, orderId)
            )
          : isNull(orderSiteSubmissions.inclusionStatus),
        with: {
          orderGroup: {
            with: {
              order: true,
              client: true,
            }
          }
        }
      });

      // 2. Migrate each submission
      for (const submission of submissionsToMigrate) {
        try {
          // Map pool to status
          const newStatus = submission.selectionPool === 'primary' 
            ? 'included' 
            : 'saved_for_later';
          
          // Use poolRank as inclusionOrder
          const newOrder = submission.poolRank || 1;

          if (!dryRun) {
            await tx.update(orderSiteSubmissions)
              .set({
                inclusionStatus: newStatus,
                inclusionOrder: newOrder,
                updatedAt: new Date(),
              })
              .where(eq(orderSiteSubmissions.id, submission.id));
          }

          results.migratedSubmissions++;
        } catch (error) {
          results.errors.push(`Failed to migrate submission ${submission.id}: ${error}`);
        }
      }

      // 3. Create retroactive benchmarks for confirmed orders without benchmarks
      const ordersNeedingBenchmarks = await tx.query.orders.findMany({
        where: orderId 
          ? eq(orders.id, orderId)
          : eq(orders.status, 'confirmed'),
      });

      for (const order of ordersNeedingBenchmarks) {
        try {
          // Check if benchmark exists
          const existingBenchmark = await tx.query.orderBenchmarks.findFirst({
            where: and(
              eq(orderBenchmarks.orderId, order.id),
              eq(orderBenchmarks.isLatest, true)
            )
          });

          if (!existingBenchmark) {
            // Get order groups and submissions for this order
            const groups = await tx.query.orderGroups.findMany({
              where: eq(orderGroups.orderId, order.id),
              with: {
                client: true,
              }
            });

            // Build benchmark data
            const benchmarkData = {
              orderTotal: order.totalRetail || 0,
              serviceFee: order.clientReviewFee || 0,
              clientGroups: await Promise.all(groups.map(async (group) => {
                const submissions = await tx.query.orderSiteSubmissions.findMany({
                  where: eq(orderSiteSubmissions.orderGroupId, group.id),
                });

                const targetPageMap = new Map<string, any[]>();
                
                submissions.forEach(sub => {
                  const url = sub.metadata?.targetPageUrl || 'unassigned';
                  if (!targetPageMap.has(url)) {
                    targetPageMap.set(url, []);
                  }
                  targetPageMap.get(url)!.push({
                    domainId: sub.domainId,
                    domain: sub.metadata?.domain || '',
                    wholesalePrice: sub.wholesalePriceSnapshot || 0,
                    retailPrice: sub.retailPriceSnapshot || 0,
                    anchorText: sub.metadata?.anchorText,
                    specialInstructions: sub.metadata?.specialInstructions,
                    metrics: {
                      dr: sub.metadata?.dr,
                      traffic: sub.metadata?.traffic,
                      qualityScore: sub.metadata?.qualityScore,
                    }
                  });
                });

                const targetPages = Array.from(targetPageMap.entries()).map(([url, domains]) => ({
                  url,
                  requestedLinks: domains.length,
                  requestedDomains: domains,
                }));

                return {
                  clientId: group.clientId,
                  clientName: group.client?.name || '',
                  linkCount: group.linkCount || 0,
                  targetPages,
                };
              })),
              totalRequestedLinks: groups.reduce((sum, g) => sum + (g.linkCount || 0), 0),
              totalClients: groups.length,
              totalTargetPages: groups.reduce((sum, g) => sum + ((g.targetPages as any[])?.length || 0), 0),
              totalUniqueDomains: 0, // Will calculate after
            };

            // Calculate unique domains
            const uniqueDomains = new Set<string>();
            benchmarkData.clientGroups.forEach(group => {
              group.targetPages.forEach(page => {
                page.requestedDomains.forEach(domain => {
                  uniqueDomains.add(domain.domainId);
                });
              });
            });
            benchmarkData.totalUniqueDomains = uniqueDomains.size;

            if (!dryRun) {
              await tx.insert(orderBenchmarks).values({
                orderId: order.id,
                version: 1,
                isLatest: true,
                capturedBy: session.userId,
                captureReason: 'migration_retroactive',
                benchmarkData,
                notes: 'Retroactively created during pool-to-status migration',
              });
            }

            results.createdBenchmarks++;
          }
        } catch (error) {
          results.errors.push(`Failed to create benchmark for order ${order.id}: ${error}`);
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? `DRY RUN: Would migrate ${results.migratedSubmissions} submissions and create ${results.createdBenchmarks} benchmarks`
        : `Migrated ${results.migratedSubmissions} submissions and created ${results.createdBenchmarks} benchmarks`,
      ...results,
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check migration status
 */
export async function GET(request: NextRequest) {
  try {
    // Check auth
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count submissions needing migration
    const unmigrated = await db.query.orderSiteSubmissions.findMany({
      where: isNull(orderSiteSubmissions.inclusionStatus),
    });

    // Count orders needing benchmarks
    const confirmedOrders = await db.query.orders.findMany({
      where: eq(orders.status, 'confirmed'),
    });

    let ordersNeedingBenchmarks = 0;
    for (const order of confirmedOrders) {
      const benchmark = await db.query.orderBenchmarks.findFirst({
        where: and(
          eq(orderBenchmarks.orderId, order.id),
          eq(orderBenchmarks.isLatest, true)
        )
      });
      if (!benchmark) {
        ordersNeedingBenchmarks++;
      }
    }

    return NextResponse.json({
      unmigratedSubmissions: unmigrated.length,
      ordersNeedingBenchmarks,
      migrationComplete: unmigrated.length === 0 && ordersNeedingBenchmarks === 0,
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check migration status' },
      { status: 500 }
    );
  }
}