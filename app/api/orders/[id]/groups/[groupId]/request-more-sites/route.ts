import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id: orderId, groupId } = await params;
    const session = await AuthServiceServer.getSession(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      shortfallCount, 
      rejectionReasons,
      requestedTotal,
      approvedCount,
      generalFeedback 
    } = body;

    // Verify order exists and user has access
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account' && order.accountId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the order group
    const orderGroup = await db.query.orderGroups.findFirst({
      where: and(
        eq(orderGroups.id, groupId),
        eq(orderGroups.orderId, orderId)
      )
    });

    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    // Start transaction to update everything atomically
    await db.transaction(async (tx) => {
      // Update order state to indicate more suggestions needed
      const currentNotes = order.internalNotes || '';
      const timestamp = new Date().toISOString();
      
      // Track suggestion rounds in internal notes
      const roundMatch = currentNotes.match(/\[SUGGESTION_ROUND: (\d+)\]/);
      const currentRound = roundMatch ? parseInt(roundMatch[1]) : 1;
      const nextRound = currentRound + 1;
      
      let updatedNotes = currentNotes;
      if (roundMatch) {
        updatedNotes = currentNotes.replace(
          /\[SUGGESTION_ROUND: \d+\]/,
          `[SUGGESTION_ROUND: ${nextRound}]`
        );
      } else {
        updatedNotes = `[SUGGESTION_ROUND: ${nextRound}]\n` + currentNotes;
      }
      
      // Add feedback about what's needed
      const feedbackNote = `\n[MORE_SITES_REQUESTED ${timestamp}] Client approved ${approvedCount} of ${requestedTotal}, needs ${shortfallCount} more sites. ${generalFeedback ? `Feedback: ${generalFeedback}` : ''}`;
      updatedNotes += feedbackNote;

      await tx.update(orders)
        .set({
          state: 'analyzing', // Back to finding more sites
          internalNotes: updatedNotes,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      // Update order group metadata to track rounds
      const groupMetadata = (orderGroup.requirementOverrides as any) || {};
      const suggestionRounds = groupMetadata.suggestionRounds || [];
      
      suggestionRounds.push({
        round: currentRound,
        timestamp,
        requestedTotal,
        approvedCount,
        shortfallCount,
        requestedBy: session.email,
        generalFeedback
      });

      await tx.update(orderGroups)
        .set({
          requirementOverrides: {
            ...groupMetadata,
            suggestionRounds,
            needsMoreSuggestions: true,
            lastFeedbackAt: timestamp,
            totalRequestedLinks: requestedTotal,
            totalApprovedLinks: approvedCount
          },
          updatedAt: new Date()
        })
        .where(eq(orderGroups.id, groupId));

      // Store rejection reasons for each submission
      if (rejectionReasons) {
        for (const [submissionId, feedback] of Object.entries(rejectionReasons)) {
          const { reason, notes } = feedback as any;
          
          // Get current submission
          const submission = await tx.query.orderSiteSubmissions.findFirst({
            where: eq(orderSiteSubmissions.id, submissionId)
          });

          if (submission) {
            const submissionMetadata = (submission.metadata as any) || {};
            
            await tx.update(orderSiteSubmissions)
              .set({
                clientReviewNotes: notes || submission.clientReviewNotes,
                metadata: {
                  ...submissionMetadata,
                  rejectionReason: reason,
                  rejectionCategory: reason,
                  feedbackProvidedAt: timestamp,
                  feedbackRound: currentRound
                }
              })
              .where(eq(orderSiteSubmissions.id, submissionId));
          }
        }
      }
    });

    // Log for notification system (TODO: Implement actual notifications)
    console.log('[REQUEST_MORE_SITES]', {
      orderId,
      groupId,
      clientId: orderGroup.clientId,
      shortfallCount,
      approvedCount,
      requestedTotal,
      requestedBy: session.email,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Request for ${shortfallCount} additional sites has been submitted`,
      nextRound: (orderGroup.requirementOverrides as any)?.suggestionRounds?.length + 1 || 2,
      orderState: 'analyzing'
    });

  } catch (error) {
    console.error('Error requesting more sites:', error);
    return NextResponse.json(
      { error: 'Failed to request more sites' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id: orderId, groupId } = await params;
    const session = await AuthServiceServer.getSession(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get order group with metadata
    const orderGroup = await db.query.orderGroups.findFirst({
      where: and(
        eq(orderGroups.id, groupId),
        eq(orderGroups.orderId, orderId)
      )
    });

    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    const metadata = (orderGroup.requirementOverrides as any) || {};
    
    // Get submissions for this order group
    const submissions = await db.query.orderSiteSubmissions.findMany({
      where: eq(orderSiteSubmissions.orderGroupId, groupId)
    });
    
    // Calculate current status
    const totalSubmissions = submissions.length;
    const approvedSubmissions = submissions.filter(s => 
      s.submissionStatus === 'client_approved' || 
      s.inclusionStatus === 'included'
    ).length;
    const rejectedSubmissions = submissions.filter(s => 
      s.submissionStatus === 'client_rejected' || 
      s.inclusionStatus === 'excluded'
    ).length;

    return NextResponse.json({
      requestedLinks: orderGroup.linkCount,
      totalSuggestions: totalSubmissions,
      approvedCount: approvedSubmissions,
      rejectedCount: rejectedSubmissions,
      shortfall: Math.max(0, orderGroup.linkCount - approvedSubmissions),
      suggestionRounds: metadata.suggestionRounds || [],
      needsMoreSuggestions: metadata.needsMoreSuggestions || false,
      currentRound: metadata.suggestionRounds?.length || 1
    });

  } catch (error) {
    console.error('Error getting suggestion status:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestion status' },
      { status: 500 }
    );
  }
}