import { NextRequest, NextResponse } from 'next/server';
import { DataForSeoCacheService } from '@/lib/services/dataForSeoCacheService';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('DataForSEO cache check endpoint called');
  
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    
    const { domainId, keywords } = body;

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      );
    }

    // Check cache analysis
    const cacheAnalysis = await DataForSeoCacheService.analyzeKeywordCache(
      domainId,
      keywords
    );

    // Get cache statistics
    const cacheStats = await DataForSeoCacheService.getCacheStats(domainId);

    return NextResponse.json({
      success: true,
      cacheAnalysis: {
        newKeywords: cacheAnalysis.newKeywords,
        existingKeywords: cacheAnalysis.existingKeywords,
        totalExistingResults: cacheAnalysis.existingResults.length,
        shouldRefreshAll: cacheAnalysis.shouldRefreshAll,
        daysSinceLastAnalysis: cacheAnalysis.daysSinceLastAnalysis,
        apiCallsSaved: cacheAnalysis.apiCallsSaved,
      },
      cacheStats,
      recommendation: getRecommendation(cacheAnalysis),
    });
  } catch (error: any) {
    console.error('Cache check error:', error);
    return NextResponse.json(
      { error: 'Failed to check cache', details: error.message },
      { status: 500 }
    );
  }
}

function getRecommendation(cacheAnalysis: any): string {
  if (cacheAnalysis.shouldRefreshAll) {
    return `Data is ${cacheAnalysis.daysSinceLastAnalysis} days old. Recommend refreshing all keywords.`;
  }
  
  if (cacheAnalysis.newKeywords.length === 0) {
    return 'All keywords are cached. No API call needed.';
  }
  
  const percentNew = (cacheAnalysis.newKeywords.length / 
    (cacheAnalysis.newKeywords.length + cacheAnalysis.existingKeywords.length)) * 100;
  
  if (percentNew > 80) {
    return `${Math.round(percentNew)}% of keywords are new. Consider full analysis.`;
  }
  
  return `Will analyze ${cacheAnalysis.newKeywords.length} new keywords and use cached data for ${cacheAnalysis.existingKeywords.length} keywords.`;
}