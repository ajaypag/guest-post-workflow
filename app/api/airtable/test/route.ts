import { NextRequest, NextResponse } from 'next/server';
import { AirtableService } from '@/lib/services/airtableService';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check based on existing auth pattern

    // Test basic connectivity and credentials
    const testFilters = {
      minDR: 50,
      maxDR: 70,
      minTraffic: 1000,
      status: 'Active' as const
    };

    console.log('Testing Airtable connection with filters:', testFilters);

    const { websites, hasMore } = await AirtableService.searchWebsites(testFilters, 5);

    return NextResponse.json({
      success: true,
      message: 'Airtable connection successful',
      sampleData: {
        totalFound: websites.length,
        hasMore,
        websites: websites.slice(0, 3), // Return first 3 as sample
      },
      credentials: {
        baseIdConfigured: !!process.env.AIRTABLE_BASE_ID,
        apiKeyConfigured: !!process.env.AIRTABLE_API_KEY,
      }
    });
  } catch (error: any) {
    console.error('Airtable test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to connect to Airtable',
        credentials: {
          baseIdConfigured: !!process.env.AIRTABLE_BASE_ID,
          apiKeyConfigured: !!process.env.AIRTABLE_API_KEY,
        }
      },
      { status: 500 }
    );
  }
}