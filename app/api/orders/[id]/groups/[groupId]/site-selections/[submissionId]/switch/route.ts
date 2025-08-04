import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { eq, and, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * Switch a domain between primary and alternative pools
 * Maintains the required count of primary domains per target URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string; submissionId: string }> }
) {
  try {
    const { submissionId, groupId } = await params;

    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both internal and account users can switch domains
    if (session.userType !== 'internal' && session.userType !== 'account') {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 403 });
    }

    // Use a transaction to ensure consistency
    const result = await db.transaction(async (tx) => {
      // 1. Get the submission being switched
      const submission = await tx.query.orderSiteSubmissions.findFirst({
        where: and(
          eq(orderSiteSubmissions.id, submissionId),
          eq(orderSiteSubmissions.orderGroupId, groupId)
        )
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      const targetUrl = submission.metadata?.targetPageUrl || 'unassigned';

      // 2. If already primary, switch to alternative
      if (submission.selectionPool === 'primary') {
        // Find the highest-ranked alternative to promote
        const alternativeToPromote = await tx.query.orderSiteSubmissions.findFirst({
          where: and(
            eq(orderSiteSubmissions.orderGroupId, groupId),
            sql`(metadata->>'targetPageUrl' = ${targetUrl} OR target_page_url = ${targetUrl})`,
            eq(orderSiteSubmissions.selectionPool, 'alternative')
          ),
          orderBy: [orderSiteSubmissions.poolRank]
        });

        if (!alternativeToPromote) {
          throw new Error('No alternative domain available to promote');
        }

        // Swap their pools
        // Move current primary to alternative (with rank at the end)
        const maxAltRank = await tx.execute(sql`
          SELECT COALESCE(MAX(pool_rank), 0) as max_rank
          FROM order_site_submissions
          WHERE order_group_id = ${groupId}
          AND (metadata->>'targetPageUrl' = ${targetUrl} OR target_page_url = ${targetUrl})
          AND selection_pool = 'alternative'
        `);

        await tx
          .update(orderSiteSubmissions)
          .set({
            selectionPool: 'alternative',
            poolRank: Number(maxAltRank.rows[0]?.max_rank || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(orderSiteSubmissions.id, submission.id));

        // Promote alternative to primary (keep its rank among primaries)
        await tx
          .update(orderSiteSubmissions)
          .set({
            selectionPool: 'primary',
            poolRank: submission.poolRank, // Take the old primary's rank
            updatedAt: new Date()
          })
          .where(eq(orderSiteSubmissions.id, alternativeToPromote.id));

        // Re-rank alternatives to fill the gap
        await tx.execute(sql`
          WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY pool_rank) as new_rank
            FROM order_site_submissions
            WHERE order_group_id = ${groupId}
            AND (metadata->>'targetPageUrl' = ${targetUrl} OR target_page_url = ${targetUrl})
            AND selection_pool = 'alternative'
          )
          UPDATE order_site_submissions
          SET pool_rank = ranked.new_rank
          FROM ranked
          WHERE order_site_submissions.id = ranked.id
        `);

        return {
          switched: submission.id,
          promoted: alternativeToPromote.id,
          action: 'demoted_to_alternative'
        };
      } 
      // 3. If alternative, try to switch with a primary
      else {
        // Find a primary to swap with (prefer lowest rank for consistency)
        const primaryToSwap = await tx.query.orderSiteSubmissions.findFirst({
          where: and(
            eq(orderSiteSubmissions.orderGroupId, groupId),
            sql`(metadata->>'targetPageUrl' = ${targetUrl} OR target_page_url = ${targetUrl})`,
            eq(orderSiteSubmissions.selectionPool, 'primary')
          ),
          orderBy: [orderSiteSubmissions.poolRank]
        });

        if (!primaryToSwap) {
          throw new Error('No primary domain available to swap');
        }

        // Swap their pools and ranks
        const submissionRank = submission.poolRank;
        const primaryRank = primaryToSwap.poolRank;

        await tx
          .update(orderSiteSubmissions)
          .set({
            selectionPool: 'primary',
            poolRank: primaryRank,
            updatedAt: new Date()
          })
          .where(eq(orderSiteSubmissions.id, submission.id));

        await tx
          .update(orderSiteSubmissions)
          .set({
            selectionPool: 'alternative',
            poolRank: submissionRank,
            updatedAt: new Date()
          })
          .where(eq(orderSiteSubmissions.id, primaryToSwap.id));

        return {
          switched: submission.id,
          demoted: primaryToSwap.id,
          action: 'promoted_to_primary'
        };
      }
    });

    return NextResponse.json({
      success: true,
      message: result.action === 'promoted_to_primary' 
        ? 'Domain promoted to primary' 
        : 'Domain moved to alternatives',
      result
    });

  } catch (error: any) {
    console.error('Error switching domain:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to switch domain' },
      { status: 500 }
    );
  }
}