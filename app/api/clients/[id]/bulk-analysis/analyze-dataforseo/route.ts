import { NextRequest, NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataForSeoService';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { 
      domainId,
      locationCode = 2840, 
      languageCode = 'en' 
    } = await request.json();

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Get domain details
    const domains = await BulkAnalysisService.getClientDomains(clientId);
    const domain = domains.find(d => d.id === domainId);
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Get keywords for the domain
    const keywords = await BulkAnalysisService.getTargetPageKeywords(domain.targetPageIds as string[]);

    // Analyze with DataForSEO
    const result = await DataForSeoService.analyzeDomain(
      domain.id,
      domain.domain,
      keywords,
      locationCode,
      languageCode
    );

    return NextResponse.json({ 
      success: true,
      result 
    });
  } catch (error: any) {
    console.error('DataForSEO analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze domain', details: error.message },
      { status: 500 }
    );
  }
}