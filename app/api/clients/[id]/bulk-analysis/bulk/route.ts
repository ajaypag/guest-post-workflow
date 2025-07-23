import { NextRequest, NextResponse } from 'next/server';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

// Bulk operations endpoint
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { domainIds, status, action } = await request.json();

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'No domains selected' },
        { status: 400 }
      );
    }

    if (action === 'updateStatus') {
      if (!status || !['high_quality', 'average_quality', 'disqualified'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      const count = await BulkAnalysisService.bulkUpdateStatus(
        domainIds,
        status,
        'system' // Placeholder since no auth
      );

      return NextResponse.json({ 
        success: true,
        updated: count 
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { error: 'Bulk operation failed', details: error.message },
      { status: 500 }
    );
  }
}

// Bulk delete endpoint
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { domainIds } = await request.json();

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'No domains selected' },
        { status: 400 }
      );
    }

    const count = await BulkAnalysisService.bulkDeleteDomains(domainIds);

    return NextResponse.json({ 
      success: true,
      deleted: count 
    });
  } catch (error: any) {
    console.error('Error bulk deleting domains:', error);
    return NextResponse.json(
      { error: 'Failed to delete domains', details: error.message },
      { status: 500 }
    );
  }
}