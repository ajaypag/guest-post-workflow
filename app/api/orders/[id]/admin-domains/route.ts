import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Internal access required' }, { status: 403 });
    }

    const { id: orderId } = await params;

    // Get order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get order groups with target pages and client details
    const orderGroupsList = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, orderId),
      with: {
        client: true
      }
    });

    // Get all submissions for this order with domain details
    const allSubmissions = [];
    for (const group of orderGroupsList) {
      const submissions = await db.query.orderSiteSubmissions.findMany({
        where: eq(orderSiteSubmissions.orderGroupId, group.id)
      });
      
      for (const submission of submissions) {
        // Get domain details
        const domain = await db.query.bulkAnalysisDomains.findFirst({
          where: eq(bulkAnalysisDomains.id, submission.domainId)
        });

        allSubmissions.push({
          ...submission,
          domain,
          orderGroup: group,
          targetPageUrl: submission.metadata?.targetPageUrl || null
        });
      }
    }

    return NextResponse.json({
      success: true,
      submissions: allSubmissions,
      orderGroups: orderGroupsList
    });

  } catch (error) {
    console.error('Error fetching admin domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin domains', details: error },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Internal access required' }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { updates } = body; // Array of {submissionId, newTargetUrl, newOrderGroupId, newPool}

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ 
        error: 'Updates array is required' 
      }, { status: 400 });
    }

    const results = [];

    for (const update of updates) {
      const { submissionId, newTargetUrl, newOrderGroupId, newPool } = update;

      if (!submissionId) {
        results.push({ submissionId, success: false, error: 'Missing submissionId' });
        continue;
      }

      try {
        // Get current submission
        const submission = await db.query.orderSiteSubmissions.findFirst({
          where: eq(orderSiteSubmissions.id, submissionId)
        });

        if (!submission) {
          results.push({ submissionId, success: false, error: 'Submission not found' });
          continue;
        }

        // Determine pool rank if changing pools
        let poolRank = submission.poolRank;
        if (newPool && newPool !== submission.selectionPool) {
          // Get count of submissions in the new pool for this target URL
          const existingInPool = await db.query.orderSiteSubmissions.findMany({
            where: and(
              eq(orderSiteSubmissions.orderGroupId, newOrderGroupId || submission.orderGroupId),
              eq(orderSiteSubmissions.selectionPool, newPool)
            )
          });

          // Filter by target URL if provided
          let sameTarget = existingInPool;
          if (newTargetUrl) {
            sameTarget = existingInPool.filter(s => {
              const metadata = s.metadata as any;
              return metadata?.targetPageUrl === newTargetUrl;
            });
          }

          poolRank = sameTarget.length + 1;
        }

        // Build update object
        const updateData: any = {};
        
        if (newOrderGroupId && newOrderGroupId !== submission.orderGroupId) {
          updateData.orderGroupId = newOrderGroupId;
        }
        
        if (newPool && newPool !== submission.selectionPool) {
          updateData.selectionPool = newPool;
          updateData.poolRank = poolRank;
        }

        if (newTargetUrl !== undefined) {
          updateData.metadata = {
            ...submission.metadata as any,
            targetPageUrl: newTargetUrl
          };
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          await db.update(orderSiteSubmissions)
            .set(updateData)
            .where(eq(orderSiteSubmissions.id, submissionId));
        }

        results.push({ submissionId, success: true });

      } catch (error) {
        results.push({ 
          submissionId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error updating admin domains:', error);
    return NextResponse.json(
      { error: 'Failed to update domains', details: error },
      { status: 500 }
    );
  }
}