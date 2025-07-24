import { NextRequest, NextResponse } from 'next/server';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { targetPageIds } = await request.json();

    if (!targetPageIds || !Array.isArray(targetPageIds) || targetPageIds.length === 0) {
      return NextResponse.json(
        { error: 'No target pages selected' },
        { status: 400 }
      );
    }

    const result = await BulkAnalysisService.refreshPendingDomains(
      id,
      targetPageIds
    );

    return NextResponse.json({ 
      success: true,
      refreshedCount: result.length,
      domains: result 
    });
  } catch (error: any) {
    console.error('Error refreshing pending domains:', error);
    return NextResponse.json(
      { error: 'Failed to refresh domains', details: error.message },
      { status: 500 }
    );
  }
}