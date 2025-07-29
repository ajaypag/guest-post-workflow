import { NextRequest, NextResponse } from 'next/server';
import { AirtableService } from '@/lib/services/airtableService';
import { WebsiteFilters } from '@/types/airtable';

export async function GET(request: NextRequest) {
  try {
    // Return categories for filter dropdown
    const categories = await AirtableService.getCategories();
    
    return NextResponse.json({
      categories
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 Airtable API: POST request received');
  try {
    const { filters, limit, offset, includeEnhancedData } = await request.json();
    console.log('📊 Request data:', { filters, limit, offset, includeEnhancedData });
    
    if (!filters) {
      return NextResponse.json(
        { error: 'Filters are required' },
        { status: 400 }
      );
    }
    
    // Search websites with filters
    console.log('🔍 Calling AirtableService.searchWebsites');
    const result = await AirtableService.searchWebsites(
      filters as WebsiteFilters,
      limit || 50,
      offset
    );
    console.log('✅ AirtableService returned:', {
      websitesCount: result.websites?.length,
      hasMore: result.hasMore,
      nextOffset: result.nextOffset,
      firstWebsite: result.websites?.[0]
    });
    
    // No need to enhance - PostFlow data comes directly from lookup fields
    const websites = result.websites;
    
    console.log('📤 Sending response with:', {
      websitesCount: websites?.length,
      hasMore: result.hasMore,
      sampleWebsite: websites?.[0] ? {
        id: websites[0].id,
        domain: websites[0].domain,
        domainRating: websites[0].domainRating,
        hasContacts: websites[0].contacts?.length > 0
      } : null
    });
    
    return NextResponse.json({
      websites,
      hasMore: result.hasMore,
      nextOffset: result.nextOffset
    });
  } catch (error: any) {
    console.error('❌ Error searching Airtable websites:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to search websites', details: error.message },
      { status: 500 }
    );
  }
}