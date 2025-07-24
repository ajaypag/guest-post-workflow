import { NextRequest, NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataForSeoService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domainId = searchParams.get('domainId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Get results from database
    const { results, total } = await DataForSeoService.getStoredResults(
      domainId,
      limit,
      offset
    );

    return NextResponse.json({ 
      results,
      total,
      limit,
      offset,
      hasMore: offset + results.length < total
    });
  } catch (error: any) {
    console.error('Error fetching DataForSEO results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results', details: error.message },
      { status: 500 }
    );
  }
}