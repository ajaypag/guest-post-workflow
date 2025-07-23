import { NextRequest, NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataForSeoService';

export async function POST(request: NextRequest) {
  console.log('Standalone DataForSEO analyze endpoint called');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const { 
      domain,
      domainId,
      keywords,
      locationCode = 2840, 
      languageCode = 'en' 
    } = body;

    if (!domain || !keywords || !Array.isArray(keywords)) {
      console.error('Missing required fields');
      return NextResponse.json(
        { error: 'Domain and keywords are required' },
        { status: 400 }
      );
    }

    console.log('Analyzing domain:', domain);
    console.log('Keywords:', keywords);

    // Check DataForSEO credentials
    console.log('DataForSEO credentials check:', {
      hasLogin: !!process.env.DATAFORSEO_LOGIN,
      hasPassword: !!process.env.DATAFORSEO_PASSWORD
    });

    // Analyze with DataForSEO
    console.log('Starting DataForSEO analysis...');
    const result = await DataForSeoService.analyzeDomain(
      domainId || `temp-${Date.now()}`, // Use temp ID if no domain ID
      domain,
      keywords,
      locationCode,
      languageCode
    );
    
    console.log('DataForSEO analysis result:', {
      status: result.status,
      totalFound: result.totalFound,
      error: result.error
    });

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