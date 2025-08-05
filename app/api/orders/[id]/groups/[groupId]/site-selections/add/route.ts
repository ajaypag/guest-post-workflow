import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { orderSiteSubmissions, projectOrderAssociations } from '@/lib/db/projectOrderAssociationsSchema';
import { eq, and, inArray } from 'drizzle-orm';
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

    // Count target page requirements from order group
    const targetUrlCounts = new Map<string, number>();
    if (orderGroup.targetPages && Array.isArray(orderGroup.targetPages)) {
      (orderGroup.targetPages as any[]).forEach(page => {
        const url = page.url;
        if (url) {
          targetUrlCounts.set(url, (targetUrlCounts.get(url) || 0) + 1);
        }
      });
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

    // Prepare new submissions (only non-duplicates) with pool assignments
    const timestamp = new Date();
    const newSubmissions = domains
      .filter(d => validDomainIds.has(d.domainId) && !existingDomainIds.has(d.domainId))
      .map(domain => {
        const targetUrl = domain.targetPageUrl || 'unassigned';
        const requiredCount = targetUrlCounts.get(targetUrl) || 0;
        const currentPrimaryCount = existingByUrl.get(targetUrl) || 0;
        
        // Determine pool assignment
        const needsMorePrimary = currentPrimaryCount < requiredCount;
        const selectionPool = needsMorePrimary ? 'primary' : 'alternative';
        
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

        return {
          id: uuidv4(),
          orderGroupId: groupId,
          domainId: domain.domainId,
          submissionStatus: 'pending', // Always start as pending for client review
          selectionPool,
          poolRank,
          metadata: {
            // Target URL is optional and can be updated later
            targetPageUrl: domain.targetPageUrl || null,
            anchorText: domain.anchorText || null,
            specialInstructions: domain.specialInstructions || null,
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