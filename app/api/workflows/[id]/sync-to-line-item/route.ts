/**
 * API endpoint to sync workflow publication verification results to order line items
 */

import { NextResponse } from 'next/server';
import { WorkflowLineItemSyncService } from '@/lib/services/workflowLineItemSyncService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body = await request.json();
    const { stepOutputs, userId, forceDeliver = false } = body;

    if (!stepOutputs) {
      return NextResponse.json(
        { error: 'Step outputs are required' },
        { status: 400 }
      );
    }

    // Call the sync service
    const result = await WorkflowLineItemSyncService.handlePublicationVerificationComplete(
      workflowId,
      stepOutputs,
      userId,
      forceDeliver
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lineItemId: result.lineItemId,
      message: forceDeliver 
        ? 'Line item force delivered with manual override' 
        : 'Line item synced successfully'
    });

  } catch (error) {
    console.error('[sync-to-line-item] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync workflow to line item' },
      { status: 500 }
    );
  }
}