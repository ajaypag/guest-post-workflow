import { NextRequest, NextResponse } from 'next/server';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { domains } = await request.json();

    if (!domains || !Array.isArray(domains)) {
      return NextResponse.json(
        { error: 'Invalid domains provided' },
        { status: 400 }
      );
    }

    const existing = await BulkAnalysisService.getExistingDomains(id, domains);
    
    return NextResponse.json({ existing });
  } catch (error: any) {
    console.error('Error checking existing domains:', error);
    return NextResponse.json(
      { error: 'Failed to check domains', details: error.message },
      { status: 500 }
    );
  }
}