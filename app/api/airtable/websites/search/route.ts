import { NextRequest, NextResponse } from 'next/server';
import { AirtableService } from '@/lib/services/airtableService';
import { WebsiteFilters } from '@/types/airtable';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check based on existing auth pattern

    const body = await request.json();
    const filters: WebsiteFilters = body.filters || {};
    const limit = body.limit || 100;
    const offset = body.offset;
    const includeEnhancedData = body.includeEnhancedData || false;

    // Search websites with filters
    const { websites, hasMore, nextOffset } = await AirtableService.searchWebsites(
      filters, 
      limit, 
      offset
    );

    // Optionally enhance with link price data (slower but more complete)
    let finalWebsites = websites;
    if (includeEnhancedData && websites.length > 0) {
      finalWebsites = await AirtableService.enhanceWebsitesWithLinkPrices(websites);
    }

    return NextResponse.json({
      websites: finalWebsites,
      hasMore,
      nextOffset,
      total: finalWebsites.length
    });
  } catch (error: any) {
    console.error('Airtable search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search Airtable websites' },
      { status: 500 }
    );
  }
}

// GET endpoint for fetching categories
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check based on existing auth pattern

    const categories = await AirtableService.getCategories();
    
    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Airtable categories error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}