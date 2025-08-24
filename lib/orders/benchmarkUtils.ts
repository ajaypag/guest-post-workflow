import { db } from '@/lib/db/connection';
import { orderBenchmarks, benchmarkComparisons } from '@/lib/db/orderBenchmarkSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, or } from 'drizzle-orm';

/**
 * Create a benchmark snapshot when an order is confirmed
 */
export async function createOrderBenchmark(
  orderId: string,
  userId: string,
  reason: 'order_confirmed' | 'order_submitted' | 'manual_update' | 'client_revision' = 'order_confirmed'
) {
  return await db.transaction(async (tx) => {
    // Mark any existing benchmarks as not latest
    await tx.update(orderBenchmarks)
      .set({ isLatest: false })
      .where(eq(orderBenchmarks.orderId, orderId));

    // Get order data
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Try to get line items first (new system)
    const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
    const lineItems = await tx.query.orderLineItems?.findMany({
      where: eq(orderLineItems.orderId, orderId),
      with: {
        client: true,
        targetPage: true,
      }
    }) || [];

    // If we have line items, use them. Otherwise fall back to order groups
    let clientGroups: any[] = [];
    
    if (lineItems.length > 0) {
      // Filter out cancelled and refunded line items
      const activeLineItems = lineItems.filter(item => 
        !['cancelled', 'refunded'].includes(item.status)
      );
      
      // Group active line items by client
      const clientMap = new Map<string, any[]>();
      
      activeLineItems.forEach(item => {
        const clientId = item.clientId;
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, []);
        }
        clientMap.get(clientId)!.push(item);
      });

      clientGroups = Array.from(clientMap.entries()).map(([clientId, items]) => {
        const targetPages = items.map(item => ({
          url: item.targetPageUrl || item.targetPage?.url || '',
          pageId: item.targetPageId,
          requestedLinks: 1,
          anchorText: item.anchorText,
          requestedDomains: item.assignedDomainId ? [{
            domainId: item.assignedDomainId,
            domain: typeof item.assignedDomain === 'string' ? item.assignedDomain : (item.assignedDomain?.domain || ''),
            wholesalePrice: item.wholesalePrice || 0,
            retailPrice: item.approvedPrice || item.estimatedPrice || 0,
            anchorText: item.anchorText,
          }] : []
        }));

        return {
          clientId,
          clientName: items[0].client?.name || 'Unknown Client',
          linkCount: items.length,
          targetPages,
        };
      });
    } else {
      // Fall back to order groups (old system)
      const groups = await tx.query.orderGroups.findMany({
        where: eq(orderGroups.orderId, orderId),
        with: {
          client: true,
        }
      });

      // Build benchmark data - capturing the original request at confirmation time
      clientGroups = await Promise.all(groups.map(async (group) => {
      // For initial benchmark at confirmation, we capture the requested structure
      // not the selected submissions (which don't exist yet)
      
      // Check if we have any submissions yet
      const submissions = await tx.query.orderSiteSubmissions.findMany({
        where: and(
          eq(orderSiteSubmissions.orderGroupId, group.id),
          eq(orderSiteSubmissions.inclusionStatus, 'included')
        )
      });

      // If we have included submissions, use them
      if (submissions.length > 0) {
        // Group submissions by target page
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
          pageId: group.targetPages?.find((tp: any) => tp.url === url)?.pageId,
          requestedLinks: domains.length,
          requestedDomains: domains,
        }));

        return {
          clientId: group.clientId,
          clientName: group.client?.name || '',
          linkCount: submissions.length,
          targetPages,
        };
      } else {
        // No submissions yet - capture the original request structure
        const targetPages = (group.targetPages as any[] || []).map((tp: any) => ({
          url: tp.url || '',
          pageId: tp.pageId,
          requestedLinks: Math.ceil((group.linkCount || 0) / (group.targetPages?.length || 1)),
          requestedDomains: [] // No domains selected yet
        }));

        return {
          clientId: group.clientId,
          clientName: group.client?.name || '',
          linkCount: group.linkCount || 0, // Original requested link count
          targetPages,
          originalRequest: true // Flag to indicate this is the initial request
        };
      }
    }));
    } // Close the else block for order groups

    // Calculate totals
    const totalRequestedLinks = clientGroups.reduce((sum, g) => sum + g.linkCount, 0);
    const totalTargetPages = clientGroups.reduce((sum, g) => sum + g.targetPages.length, 0);
    
    // Calculate unique domains and average price
    const uniqueDomains = new Set<string>();
    let totalPrice = 0;
    let priceCount = 0;
    
    clientGroups.forEach(group => {
      group.targetPages.forEach((page: any) => {
        page.requestedDomains.forEach((domain: any) => {
          uniqueDomains.add(domain.domainId);
          if (domain.retailPrice && domain.retailPrice > 0) {
            totalPrice += domain.retailPrice;
            priceCount++;
          }
        });
      });
    });

    // Calculate estimated price per link from active line items if not set on order
    let estimatedPricePerLink = order.estimatedPricePerLink;
    if (!estimatedPricePerLink && lineItems.length > 0) {
      let totalEstimated = 0;
      let countEstimated = 0;
      // Only count active line items for price calculation
      const activeLineItems = lineItems.filter(item => 
        !['cancelled', 'refunded'].includes(item.status)
      );
      activeLineItems.forEach(item => {
        if (item.approvedPrice && item.approvedPrice > 0) {
          totalEstimated += item.approvedPrice;
          countEstimated++;
        } else if (item.estimatedPrice && item.estimatedPrice > 0) {
          totalEstimated += item.estimatedPrice;
          countEstimated++;
        }
      });
      if (countEstimated > 0) {
        estimatedPricePerLink = Math.round(totalEstimated / countEstimated);
      }
    }
    
    // If still no price, calculate from domains in benchmark
    if (!estimatedPricePerLink && priceCount > 0) {
      estimatedPricePerLink = Math.round(totalPrice / priceCount);
    }

    const benchmarkData = {
      orderTotal: order.totalRetail || 0,
      serviceFee: order.clientReviewFee || 0,
      clientGroups,
      totalRequestedLinks,
      totalClients: clientGroups.length,
      totalTargetPages,
      totalUniqueDomains: uniqueDomains.size,
      
      // Original constraints from order creation
      originalConstraints: {
        budgetRange: [order.estimatedBudgetMin, order.estimatedBudgetMax].filter(x => x != null),
        drRange: [order.preferencesDrMin, order.preferencesDrMax].filter(x => x != null),
        minTraffic: order.preferencesTrafficMin,
        estimatedLinks: order.estimatedLinksCount,
        categories: order.preferencesCategories || [],
        types: order.preferencesTypes || [],
        niches: order.preferencesNiches || [],
        estimatedPricing: order.estimatorSnapshot,
        estimatedPricePerLink: estimatedPricePerLink
      }
    };

    // Get the current version number
    const previousBenchmark = await tx.query.orderBenchmarks.findFirst({
      where: eq(orderBenchmarks.orderId, orderId),
      orderBy: (benchmarks, { desc }) => [desc(benchmarks.version)]
    });

    const newVersion = previousBenchmark ? previousBenchmark.version + 1 : 1;

    // Create new benchmark
    const [benchmark] = await tx.insert(orderBenchmarks).values({
      orderId,
      version: newVersion,
      isLatest: true,
      capturedBy: userId,
      captureReason: reason,
      benchmarkType: 'initial', // Always 'initial' for now
      benchmarkData,
      notes: reason === 'order_confirmed' || reason === 'order_submitted' 
        ? 'Initial benchmark created at order confirmation'
        : undefined,
    }).returning();

    return benchmark;
  });
}

/**
 * Compare current order state against benchmark
 */
export async function compareToBenchmark(orderId: string, userId?: string) {
  // Get latest benchmark
  const benchmark = await db.query.orderBenchmarks.findFirst({
    where: and(
      eq(orderBenchmarks.orderId, orderId),
      eq(orderBenchmarks.isLatest, true)
    )
  });

  if (!benchmark) {
    throw new Error('No benchmark found for this order');
  }

  // Get current order state - try line items first (new system), fallback to order groups
  const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
  const lineItems = await db.query.orderLineItems?.findMany({
    where: eq(orderLineItems.orderId, orderId),
    with: {
      client: true,
    }
  }) || [];

  let clientAnalysis: any[] = [];

  if (lineItems.length > 0) {
    // Use new line items system
    const activeLineItems = lineItems.filter(item => 
      !['cancelled', 'refunded'].includes(item.status)
    );

    // Group by client
    const clientMap = new Map<string, any[]>();
    activeLineItems.forEach(item => {
      const clientId = item.clientId;
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, []);
      }
      clientMap.get(clientId)!.push(item);
    });

    clientAnalysis = Array.from(clientMap.entries()).map(([clientId, items]) => {
      // Find the benchmark data for this client
      const benchmarkGroup = benchmark.benchmarkData.clientGroups.find(
        bg => bg.clientId === clientId
      );

      const requested = benchmarkGroup?.linkCount || 0;
      
      // Count assigned items as "delivered" for comparison purposes
      const delivered = items.filter(item => item.assignedDomainId).length;
      const inProgress = items.filter(item => 
        !item.assignedDomainId && ['pending', 'in_progress'].includes(item.status)
      ).length;

      // For line items, we don't have the same target page analysis structure
      // but we can create a simplified version
      const targetPageAnalysis = benchmarkGroup?.targetPages.map(benchmarkPage => {
        const pageItems = items.filter(item => 
          item.targetPageUrl === benchmarkPage.url
        );
        
        const deliveredForPage = pageItems.filter(item => item.assignedDomainId).length;

        return {
          url: benchmarkPage.url,
          requested: benchmarkPage.requestedLinks,
          delivered: deliveredForPage,
          substitutions: [], // Line items don't track substitutions the same way
          missing: [], // Would need complex logic to determine missing vs not yet assigned
          extras: [], // Would need to compare against original request
        };
      }) || [];

      return {
        clientId,
        clientName: items[0].client?.name || 'Unknown Client',
        requested,
        delivered,
        inProgress,
        targetPageAnalysis,
      };
    });
  } else {
    // Fallback to old order groups system
    const groups = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, orderId),
      with: {
        client: true,
      }
    });

    clientAnalysis = await Promise.all(groups.map(async (group) => {
      const submissions = await db.query.orderSiteSubmissions.findMany({
        where: eq(orderSiteSubmissions.orderGroupId, group.id)
      });

      // Count sites that are included (selected by internal team)
      // This includes pending sites awaiting client approval
      const delivered = submissions.filter(s => 
        s.inclusionStatus === 'included'
      ).length;
      
      const inProgress = submissions.filter(s => 
        s.submissionStatus === 'in_progress' || s.submissionStatus === 'submitted'
      ).length;

      // Find the benchmark data for this client
      const benchmarkGroup = benchmark.benchmarkData.clientGroups.find(
        bg => bg.clientId === group.clientId
      );

      const requested = benchmarkGroup?.linkCount || 0;

      // Analyze each target page
      const targetPageAnalysis = benchmarkGroup?.targetPages.map(benchmarkPage => {
      const currentSubmissions = submissions.filter(
        s => s.metadata?.targetPageUrl === benchmarkPage.url
      );

      const deliveredForPage = currentSubmissions.filter(s => 
        s.submissionStatus === 'completed' || 
        s.submissionStatus === 'client_approved' ||
        s.submissionStatus === 'pending' ||  // Sites selected but awaiting client review
        s.inclusionStatus === 'included'     // Sites marked as included in the selection
      ).length;

      // Find substitutions, missing, extras
      const substitutions: any[] = [];
      const missing: any[] = [];
      const extras: any[] = [];

      // Check for missing domains
      benchmarkPage.requestedDomains.forEach(reqDomain => {
        const found = currentSubmissions.find(s => s.domainId === reqDomain.domainId);
        if (!found) {
          missing.push({
            domain: reqDomain.domain,
            reason: 'Not yet delivered'
          });
        } else if (found.inclusionStatus === 'excluded') {
          missing.push({
            domain: reqDomain.domain,
            reason: found.exclusionReason || 'Excluded'
          });
        }
      });

      // Check for extra domains
      currentSubmissions.forEach(sub => {
        if (sub.inclusionStatus === 'included') {
          const inBenchmark = benchmarkPage.requestedDomains.find(
            rd => rd.domainId === sub.domainId
          );
          if (!inBenchmark) {
            extras.push({
              domain: sub.metadata?.domain || sub.domainId,
              reason: 'Added after confirmation'
            });
          }
        }
      });

      return {
        url: benchmarkPage.url,
        requested: benchmarkPage.requestedLinks,
        delivered: deliveredForPage,
        substitutions,
        missing,
        extras,
      };
    }) || [];

      return {
        clientId: group.clientId,
        clientName: group.client?.name || '',
        requested,
        delivered,
        inProgress,
        targetPageAnalysis,
      };
    }));
  }

  // Calculate totals
  const totalRequested = benchmark.benchmarkData.totalRequestedLinks;
  const totalDelivered = clientAnalysis.reduce((sum, ca) => sum + ca.delivered, 0);
  const completionPercentage = totalRequested > 0 
    ? Math.round((totalDelivered / totalRequested) * 100)
    : 0;

  // Financial comparison
  const expectedRevenue = benchmark.benchmarkData.orderTotal;
  
  // Calculate actual revenue and metrics from all assigned/included sites
  let actualRevenue = 0;
  let drValues: number[] = [];
  let trafficValues: number[] = [];
  
  if (lineItems.length > 0) {
    // Calculate from line items (new system)
    const assignedItems = lineItems.filter(item => 
      item.assignedDomainId && !['cancelled', 'refunded'].includes(item.status)
    );
    
    // Get domain data for DR and traffic info
    const { bulkAnalysisDomains } = await import('@/lib/db/bulkAnalysisSchema');
    const { websites } = await import('@/lib/db/websiteSchema');
    
    for (const item of assignedItems) {
      actualRevenue += item.approvedPrice || item.estimatedPrice || 0;
      
      // Get DR and traffic data for each assigned domain
      if (item.assignedDomainId) {
        try {
          // Get domain string from assignedDomain field (which contains the actual domain)
          let domainString = '';
          if (item.assignedDomain) {
            domainString = typeof item.assignedDomain === 'string' ? item.assignedDomain : (item.assignedDomain as any)?.domain || '';
          }
          
          // Get metrics from websites table for this domain
          if (domainString) {
            // Try exact match first, then try with www prefix
            let website = await db.query.websites.findFirst({
              where: eq(websites.domain, domainString)
            });
            
            // If not found, try with www prefix
            if (!website) {
              website = await db.query.websites.findFirst({
                where: eq(websites.domain, `www.${domainString}`)
              });
            }
            
            if (website) {
              if (website.domainRating && website.domainRating > 0) {
                drValues.push(website.domainRating);
              }
              if (website.totalTraffic && website.totalTraffic > 0) {
                trafficValues.push(website.totalTraffic);
              }
            }
          }
        } catch (error) {
          console.log('Error fetching domain metrics:', error);
        }
      }
    }
  } else {
    // Calculate from order groups (old system)
    const groups = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, orderId)
    });
    
    for (const group of groups) {
      const submissions = await db.query.orderSiteSubmissions.findMany({
        where: and(
          eq(orderSiteSubmissions.orderGroupId, group.id),
          eq(orderSiteSubmissions.inclusionStatus, 'included')
        )
      });
      
      actualRevenue += submissions.reduce((sum, sub) => {
        // Also collect DR and traffic values
        if (sub.metadata?.dr) drValues.push(sub.metadata.dr);
        if (sub.metadata?.traffic) trafficValues.push(sub.metadata.traffic);
        return sum + (sub.retailPriceSnapshot || 0);
      }, 0);
    }
  }
  
  // Calculate DR and traffic ranges
  const drRange = drValues.length > 0 
    ? [Math.min(...drValues), Math.max(...drValues)]
    : [];
  const trafficRange = trafficValues.length > 0
    ? [Math.min(...trafficValues), Math.max(...trafficValues)]
    : [];
  
  // Identify issues
  const issues: any[] = [];
  
  clientAnalysis.forEach(ca => {
    ca.targetPageAnalysis.forEach((tpa: any) => {
      if (tpa.missing.length > 0) {
        issues.push({
          type: 'missing' as const,
          description: `${tpa.missing.length} domains missing for ${tpa.url}`,
          affectedItems: tpa.missing.map((m: any) => m.domain)
        });
      }
      if (tpa.substitutions.length > 0) {
        issues.push({
          type: 'substitution' as const,
          description: `${tpa.substitutions.length} substitutions for ${tpa.url}`,
          affectedItems: tpa.substitutions.map((s: any) => s.requestedDomain)
        });
      }
    });
  });

  const comparisonData = {
    requestedLinks: totalRequested,
    deliveredLinks: totalDelivered,
    completionPercentage,
    expectedRevenue,
    actualRevenue,
    revenueDifference: actualRevenue - expectedRevenue,
    clientAnalysis,
    issues,
    // Add the calculated DR and traffic ranges
    drRange,
    trafficRange,
  };

  // Save comparison
  const [comparison] = await db.insert(benchmarkComparisons).values({
    benchmarkId: benchmark.id,
    orderId,
    comparedBy: userId || null,
    comparisonData,
  }).returning();

  return comparison;
}

/**
 * Get latest benchmark for an order
 */
export async function getLatestBenchmark(orderId: string) {
  return await db.query.orderBenchmarks.findFirst({
    where: and(
      eq(orderBenchmarks.orderId, orderId),
      eq(orderBenchmarks.isLatest, true)
    ),
    with: {
      capturedByUser: true,
    }
  });
}

/**
 * Get benchmark history for an order
 */
export async function getBenchmarkHistory(orderId: string) {
  return await db.query.orderBenchmarks.findMany({
    where: eq(orderBenchmarks.orderId, orderId),
    orderBy: (benchmarks, { desc }) => [desc(benchmarks.version)],
    with: {
      capturedByUser: true,
    }
  });
}

/**
 * Get latest comparison for an order
 */
export async function getLatestComparison(orderId: string) {
  return await db.query.benchmarkComparisons.findFirst({
    where: eq(benchmarkComparisons.orderId, orderId),
    orderBy: (comparisons, { desc }) => [desc(comparisons.comparedAt)],
    with: {
      benchmark: true,
      comparedByUser: true,
    }
  });
}