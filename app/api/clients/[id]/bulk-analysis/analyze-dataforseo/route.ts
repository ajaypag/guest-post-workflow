import { NextRequest, NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataForSeoService';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('DataForSEO analyze endpoint called');
  
  try {
    const { id: clientId } = await params;
    console.log('Client ID:', clientId);
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { 
      domainId,
      locationCode = 2840, 
      languageCode = 'en',
      manualKeywords,
      useCache = true // Default to using cache
    } = body;

    if (!domainId) {
      console.error('Missing domain ID');
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Get domain details
    console.log('Getting domains for client:', clientId);
    const domains = await BulkAnalysisService.getClientDomains(clientId);
    console.log('Found domains:', domains.length);
    
    const domain = domains.find(d => d.id === domainId);
    
    if (!domain) {
      console.error('Domain not found:', domainId);
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }
    
    console.log('Domain found:', domain.domain);
    console.log('Target page IDs:', domain.targetPageIds);

    // Get keywords - either manual or from target pages
    let keywords: string[] = [];
    
    if (manualKeywords && Array.isArray(manualKeywords) && manualKeywords.length > 0) {
      // Use manual keywords if provided
      keywords = manualKeywords;
      console.log('Using manual keywords:', keywords.length);
    } else {
      // Otherwise get keywords from target pages
      keywords = await BulkAnalysisService.getTargetPageKeywords(domain.targetPageIds as string[]);
      console.log('Using target page keywords:', keywords.length);
    }
    
    console.log('Keywords to analyze:', keywords.slice(0, 5));

    // Check DataForSEO credentials
    console.log('DataForSEO credentials check:', {
      hasLogin: !!process.env.DATAFORSEO_LOGIN,
      hasPassword: !!process.env.DATAFORSEO_PASSWORD
    });

    // Analyze with DataForSEO (with or without cache)
    console.log('Starting DataForSEO analysis...', { useCache });
    
    const result = useCache 
      ? await DataForSeoService.analyzeDomainWithCache(
          domain.id,
          domain.domain,
          keywords,
          locationCode,
          languageCode
        )
      : await DataForSeoService.analyzeDomain(
          domain.id,
          domain.domain,
          keywords,
          locationCode,
          languageCode
        );
    
    console.log('DataForSEO analysis result:', {
      status: result.status,
      totalFound: result.totalFound,
      error: result.error
    });

    // Update domain status if analysis was successful
    if (result.status === 'success' && result.totalFound > 0) {
      console.log('Updating domain hasDataForSeoResults status...');
      await BulkAnalysisService.updateDomainDataForSeoStatus(domainId, true);
    }

    return NextResponse.json({ 
      success: true,
      result 
    });
  } catch (error: any) {
    console.error('DataForSEO analysis error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to analyze domain', details: error.message },
      { status: 500 }
    );
  }
}