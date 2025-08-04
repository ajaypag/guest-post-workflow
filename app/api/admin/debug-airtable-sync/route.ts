import { NextRequest, NextResponse } from 'next/server';
import { AirtableService } from '@/lib/services/airtableService';

export async function POST(request: NextRequest) {
  console.log('🔍 Debug: Testing Airtable data extraction...');
  
  try {
    const { searchDomain } = await request.json().catch(() => ({ searchDomain: null }));
    // Get raw Airtable data first
    const baseUrl = 'https://api.airtable.com/v0';
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_WEBSITES_TABLE_ID || 'tblT8P0fPHV5fdrT5';
    const apiKey = process.env.AIRTABLE_API_KEY;
    const viewId = 'viwWrgaGb55n8iaVk'; // PostFlow view
    
    // Test 1: Fetch raw data WITHOUT view filter
    const rawResponseNoView = await fetch(`${baseUrl}/${baseId}/${tableId}?maxRecords=5${searchDomain ? `&filterByFormula=SEARCH("${searchDomain}", {Website})` : ''}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const rawDataNoView = await rawResponseNoView.json();
    
    // Test 2: Fetch raw data WITH view filter
    const rawResponseWithView = await fetch(`${baseUrl}/${baseId}/${tableId}?view=${viewId}&maxRecords=5${searchDomain ? `&filterByFormula=SEARCH("${searchDomain}", {Website})` : ''}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const rawDataWithView = await rawResponseWithView.json();
    
    // Test 3: Get field metadata
    const fieldsUrl = `${baseUrl}/${baseId}/${tableId}`;
    const fieldsResponse = await fetch(fieldsUrl + '?maxRecords=1', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const fieldsData = await fieldsResponse.json();
    
    // Get processed data
    const filters = searchDomain ? { searchTerm: searchDomain } : {};
    const result = await AirtableService.searchWebsites(filters, 5, undefined);
    
    const debugInfo = result.websites.map(website => ({
      id: website.id,
      domain: website.domain,
      rawCategories: website.categories,
      rawType: website.type,
      rawWebsiteType: website.websiteType,
      rawNiche: website.niche,
      categoriesLength: website.categories?.length || 0,
      typeLength: website.type?.length || 0,
      websiteTypeLength: website.websiteType?.length || 0,
      nicheLength: website.niche?.length || 0,
      hasCategories: !!website.categories && website.categories.length > 0,
      hasType: !!website.type && website.type.length > 0,
      hasWebsiteType: !!website.websiteType && website.websiteType.length > 0,
      hasNiche: !!website.niche && website.niche.length > 0
    }));
    
    console.log('🔍 Debug results:', JSON.stringify(debugInfo, null, 2));
    
    return NextResponse.json({
      success: true,
      totalWebsites: result.websites.length,
      debugInfo,
      summary: {
        withCategories: debugInfo.filter(w => w.hasCategories).length,
        withType: debugInfo.filter(w => w.hasType).length,
        withWebsiteType: debugInfo.filter(w => w.hasWebsiteType).length,
        withNiche: debugInfo.filter(w => w.hasNiche).length
      },
      rawAirtableData: {
        withoutView: rawDataNoView.records?.slice(0, 2).map((r: any) => ({
          domain: r.fields.Website,
          allFields: Object.keys(r.fields),
          typeField: r.fields.Type,
          nicheField: r.fields.Niche,
          typeFieldType: typeof r.fields.Type,
          nicheFieldType: typeof r.fields.Niche,
          isTypeArray: Array.isArray(r.fields.Type),
          isNicheArray: Array.isArray(r.fields.Niche),
          // Check all possible variations of Niche field
          nicheVariations: {
            'Niche': r.fields.Niche,
            'niche': r.fields.niche,
            'NICHE': r.fields.NICHE,
            'Niches': r.fields.Niches,
            'niches': r.fields.niches
          }
        })),
        withView: rawDataWithView.records?.slice(0, 2).map((r: any) => ({
          domain: r.fields.Website,
          allFields: Object.keys(r.fields),
          nicheField: r.fields.Niche
        })),
        fieldsSample: fieldsData.records?.[0] ? Object.keys(fieldsData.records[0].fields) : [],
        viewComparison: {
          withoutViewCount: rawDataNoView.records?.length || 0,
          withViewCount: rawDataWithView.records?.length || 0,
          viewId: viewId
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error.message },
      { status: 500 }
    );
  }
}