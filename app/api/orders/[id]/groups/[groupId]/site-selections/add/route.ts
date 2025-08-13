import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { orderSiteSubmissions, projectOrderAssociations } from '@/lib/db/projectOrderAssociationsSchema';
import { websites } from '@/lib/db/websiteSchema';
import { orderBenchmarks } from '@/lib/db/orderBenchmarkSchema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Flexible domain addition endpoint for link building workflows
 * - Appends domains without deleting existing submissions
 * - Supports optional target URL associations
 * - Allows bulk additions with duplicate prevention
 * - Designed for iterative, subjective link building process
 */
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id: orderId, groupId } = await params;
    const body = await request.json();

    // Authenticate user - must be internal
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.userType !== 'internal') {
      return NextResponse.json({ 
        error: 'Only internal users can add domain suggestions' 
      }, { status: 403 });
    }

    // Verify order and group exist
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderGroup = await db.query.orderGroups.findFirst({
      where: and(
        eq(orderGroups.orderId, orderId), 
        eq(orderGroups.id, groupId)
      ),
      with: {
        client: true
      }
    });

    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    // Extract domains from request
    const { domains } = body;
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({ 
        error: 'No domains provided' 
      }, { status: 400 });
    }

    // Validate domain IDs exist
    const domainIds = domains.map(d => d.domainId);
    const validDomains = await db.query.bulkAnalysisDomains.findMany({
      where: inArray(bulkAnalysisDomains.id, domainIds)
    });

    if (validDomains.length === 0) {
      return NextResponse.json({ 
        error: 'No valid domains found' 
      }, { status: 400 });
    }

    const validDomainIds = new Set(validDomains.map(d => d.id));

    // Get existing submissions to check for duplicates
    const existingSubmissions = await db.query.orderSiteSubmissions.findMany({
      where: eq(orderSiteSubmissions.orderGroupId, groupId)
    });
    
    const existingDomainIds = new Set(existingSubmissions.map(s => s.domainId));

    // Get the latest benchmark to determine target page requirements
    // This handles both v1 (initial) and v2 (revised) benchmarks
    const latestBenchmark = await db.query.orderBenchmarks.findFirst({
      where: and(
        eq(orderBenchmarks.orderId, orderId),
        eq(orderBenchmarks.isLatest, true)
      ),
      orderBy: desc(orderBenchmarks.version)
    });

    // Count target page requirements - prefer latest benchmark, fallback to order group
    const targetUrlCounts = new Map<string, number>();
    
    if (latestBenchmark && latestBenchmark.benchmarkData) {
      // Use latest benchmark data (handles v2 scenarios)
      const benchmarkData = latestBenchmark.benchmarkData as any;
      
      // Find the client group in the benchmark data
      const clientGroup = benchmarkData.clientGroups?.find(
        (g: any) => g.clientId === orderGroup.clientId
      );
      
      if (clientGroup && clientGroup.targetPages) {
        clientGroup.targetPages.forEach((page: any) => {
          const url = page.url;
          if (url) {
            // Use requestedLinks from benchmark for this target page
            targetUrlCounts.set(url, page.requestedLinks || 0);
          }
        });
      }
      
      console.log(`Using benchmark v${latestBenchmark.version} for target requirements:`, 
        Array.from(targetUrlCounts.entries()));
    } else if (orderGroup.targetPages && Array.isArray(orderGroup.targetPages)) {
      // Fallback to original order group data (v1 only scenario)
      (orderGroup.targetPages as any[]).forEach(page => {
        const url = page.url;
        if (url) {
          targetUrlCounts.set(url, (targetUrlCounts.get(url) || 0) + 1);
        }
      });
      
      console.log('Using orderGroup.targetPages for requirements (no benchmark found):', 
        Array.from(targetUrlCounts.entries()));
    }

    // Group existing submissions by target URL to track pool assignments
    const existingByUrl = new Map<string, number>();
    existingSubmissions.forEach(sub => {
      const url = sub.metadata?.targetPageUrl || 'unassigned';
      const currentCount = existingByUrl.get(url) || 0;
      // Only count primary pool submissions toward the requirement
      if (sub.selectionPool === 'primary') {
        existingByUrl.set(url, currentCount + 1);
      }
    });

    // Get bulk analysis domains with their actual domain names
    const domainIdsToAdd = domains
      .filter(d => validDomainIds.has(d.domainId) && !existingDomainIds.has(d.domainId))
      .map(d => d.domainId);
    
    const bulkDomains = domainIdsToAdd.length > 0 
      ? await db.query.bulkAnalysisDomains.findMany({
          where: inArray(bulkAnalysisDomains.id, domainIdsToAdd)
        })
      : [];
    
    // Create a map for easy lookup
    const bulkDomainMap = new Map(bulkDomains.map(d => [d.id, d]));
    
    // Fetch website data for all domains being added
    const domainNames = bulkDomains.map(d => d.domain.toLowerCase());
    const websiteData = domainNames.length > 0
      ? await db.query.websites.findMany({
          where: sql`LOWER(${websites.domain}) = ANY(ARRAY[${sql.join(domainNames.map(d => sql`${d}`), sql`,`)}])`
        })
      : [];
    
    // Create multiple maps for robust domain matching
    const websiteMap = new Map();
    const websiteByCleanDomain = new Map();
    
    websiteData.forEach(w => {
      const originalDomain = w.domain.toLowerCase();
      const cleanedDomain = originalDomain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .trim();
      
      // Store by original domain
      websiteMap.set(originalDomain, w);
      
      // Store by cleaned domain  
      websiteByCleanDomain.set(cleanedDomain, w);
      
      // Also store with www prefix if not already present
      if (!originalDomain.startsWith('www.')) {
        websiteMap.set(`www.${originalDomain}`, w);
      }
    });

    // Prepare new submissions (only non-duplicates) with pool assignments
    const timestamp = new Date();
    const newSubmissions = domains
      .filter(d => validDomainIds.has(d.domainId) && !existingDomainIds.has(d.domainId))
      .map(domain => {
        // Get the bulk domain and website data with enhanced matching
        const bulkDomain = bulkDomainMap.get(domain.domainId);
        let website = null;
        
        if (bulkDomain) {
          const bulkDomainLower = bulkDomain.domain.toLowerCase();
          const bulkDomainCleaned = bulkDomainLower
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '')
            .trim();
          
          // Try multiple matching strategies
          website = websiteMap.get(bulkDomainLower) ||
                   websiteMap.get(`www.${bulkDomainLower}`) ||
                   websiteByCleanDomain.get(bulkDomainCleaned) ||
                   websiteByCleanDomain.get(`www.${bulkDomainCleaned}`);
          
          // Log for debugging domain matching issues
          if (!website) {
            console.warn(`No website data found for domain: ${bulkDomain.domain}. Tried: ${bulkDomainLower}, www.${bulkDomainLower}, ${bulkDomainCleaned}, www.${bulkDomainCleaned}`);
            console.log('Available website domains:', Array.from(websiteMap.keys()).slice(0, 5));
          }
        }
        const targetUrl = domain.targetPageUrl || 'unassigned';
        const requiredCount = targetUrlCounts.get(targetUrl) || 0;
        const currentPrimaryCount = existingByUrl.get(targetUrl) || 0;
        
        // Determine pool assignment based on latest benchmark requirements
        const needsMorePrimary = currentPrimaryCount < requiredCount;
        const selectionPool = needsMorePrimary ? 'primary' : 'alternative';
        
        // Log decision for debugging
        if (domain.targetPageUrl) {
          console.log(`Domain ${bulkDomain?.domain} for ${targetUrl}: ` +
            `required=${requiredCount}, current=${currentPrimaryCount}, ` +
            `pool=${selectionPool} (using ${latestBenchmark ? `benchmark v${latestBenchmark.version}` : 'orderGroup'})`);
        }
        
        // Calculate pool rank
        let poolRank = 1;
        if (selectionPool === 'primary') {
          poolRank = currentPrimaryCount + 1;
          // Update count for next iteration
          existingByUrl.set(targetUrl, currentPrimaryCount + 1);
        } else {
          // For alternatives, count existing alternatives for this URL
          const existingAlternatives = existingSubmissions.filter(s => 
            s.metadata?.targetPageUrl === targetUrl && 
            s.selectionPool === 'alternative'
          ).length;
          poolRank = existingAlternatives + 1;
        }

        // Calculate prices if we have website data, with manual fallback support
        let guestPostCost = website?.guestPostCost ? parseFloat(website.guestPostCost) : 0;
        let domainRating = website?.domainRating || null;
        let totalTraffic = website?.totalTraffic || null;
        
        // Manual data fallback if automated matching failed
        if (!website && domain.manualData) {
          guestPostCost = domain.manualData.guestPostCost || 0;
          domainRating = domain.manualData.domainRating || null;
          totalTraffic = domain.manualData.totalTraffic || null;
          
          console.log(`Using manual data for ${bulkDomain?.domain}:`, {
            guestPostCost,
            domainRating, 
            totalTraffic
          });
        }
        
        const wholesalePrice = guestPostCost ? Math.round(guestPostCost * 100) : 0; // Convert to cents
        const serviceFee = 7900; // $79 service fee in cents
        const retailPrice = wholesalePrice + serviceFee;
        
        return {
          id: uuidv4(),
          orderGroupId: groupId,
          domainId: domain.domainId,
          submissionStatus: 'pending', // Always start as pending for client review
          selectionPool,
          poolRank,
          // Add price snapshots if we have the data
          ...(wholesalePrice > 0 && {
            wholesalePriceSnapshot: wholesalePrice,
            retailPriceSnapshot: retailPrice,
            serviceFeeSnapshot: serviceFee,
            priceSnapshotAt: timestamp
          }),
          metadata: {
            // Target URL is optional and can be updated later
            targetPageUrl: domain.targetPageUrl || null,
            anchorText: domain.anchorText || null,
            specialInstructions: domain.specialInstructions || null,
            // Include website metrics from websites table or manual data
            domain: bulkDomain?.domain || null,
            dr: domainRating,
            traffic: totalTraffic,
            guestPostCost: guestPostCost || null,
            dataSource: website ? 'automated' : (domain.manualData ? 'manual' : 'none'),
            // Track suggestion metadata
            suggestedBy: session.userId,
            suggestedAt: timestamp.toISOString(),
            suggestedReason: domain.reason || null,
            // Support for bulk/batch tracking
            batchId: body.batchId || null,
            // Allow flexible metadata for future use
            ...domain.metadata,
            // Track status history
            statusHistory: [{
              status: 'pending',
              timestamp: timestamp.toISOString(),
              updatedBy: session.userId,
              notes: 'Initial suggestion'
            }]
          },
          submittedBy: session.userId,
          submittedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      });

    if (newSubmissions.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'All domains were already suggested for this order group',
        duplicatesSkipped: domains.length,
        added: 0,
        totalSuggestions: existingSubmissions.length
      });
    }

    // Insert new submissions
    await db.insert(orderSiteSubmissions).values(newSubmissions);

    // Get updated count and statistics
    const updatedSubmissions = await db.query.orderSiteSubmissions.findMany({
      where: eq(orderSiteSubmissions.orderGroupId, groupId)
    });

    // Calculate statistics
    const stats = {
      total: updatedSubmissions.length,
      pending: updatedSubmissions.filter(s => s.submissionStatus === 'pending').length,
      approved: updatedSubmissions.filter(s => s.submissionStatus === 'client_approved').length,
      rejected: updatedSubmissions.filter(s => s.submissionStatus === 'client_rejected').length,
      withTargetUrl: updatedSubmissions.filter(s => s.metadata?.targetPageUrl).length,
      orphaned: updatedSubmissions.filter(s => !s.metadata?.targetPageUrl).length
    };

    return NextResponse.json({ 
      success: true,
      added: newSubmissions.length,
      duplicatesSkipped: domains.length - newSubmissions.length,
      stats,
      message: `Successfully added ${newSubmissions.length} new domain${newSubmissions.length !== 1 ? 's' : ''} to ${orderGroup.client?.name || 'order group'}`
    });

  } catch (error) {
    console.error('Error adding domain suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to add domain suggestions' },
      { status: 500 }
    );
  }
}