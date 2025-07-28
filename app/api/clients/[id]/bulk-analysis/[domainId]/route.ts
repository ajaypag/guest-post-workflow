import { NextRequest, NextResponse } from 'next/server';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const { domainId } = await params;
    const domain = await BulkAnalysisService.getDomainById(domainId);

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(domain);
  } catch (error: any) {
    console.error('Error fetching domain:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domain', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const { domainId } = await params;
    const { status, notes, userId, isManual, selectedTargetPageId } = await request.json();

    if (!status || !['pending', 'high_quality', 'average_quality', 'disqualified'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const updated = await BulkAnalysisService.updateQualificationStatus(
      domainId,
      status,
      userId,
      notes,
      isManual,
      selectedTargetPageId
    );

    return NextResponse.json({ 
      success: true,
      domain: updated 
    });
  } catch (error: any) {
    console.error('Error updating domain status:', error);
    return NextResponse.json(
      { error: 'Failed to update domain', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const { domainId } = await params;
    await BulkAnalysisService.deleteDomain(domainId);

    return NextResponse.json({ 
      success: true 
    });
  } catch (error: any) {
    console.error('Error deleting domain:', error);
    return NextResponse.json(
      { error: 'Failed to delete domain', details: error.message },
      { status: 500 }
    );
  }
}