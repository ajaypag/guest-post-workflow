import { NextRequest, NextResponse } from 'next/server';
import { AirtableService } from '@/lib/services/airtableService';

export async function POST(request: NextRequest) {
  console.log('🔍 Debug: Testing Airtable data extraction...');
  
  try {
    // Get first few websites from Airtable
    const result = await AirtableService.searchWebsites({}, 5, undefined);
    
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