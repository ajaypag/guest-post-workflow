import { NextRequest, NextResponse } from 'next/server';
import { MasterQualificationService } from '@/lib/services/masterQualificationService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    
    const {
      domainIds,
      targetPageIds,
      locationCode = 2840,
      languageCode = 'en',
      skipDataForSeo = false,
      skipAI = false,
      skipTargetMatching = false
    } = body;

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'Domain IDs are required' },
        { status: 400 }
      );
    }

    console.log(`🚀 Master qualification requested for ${domainIds.length} domains`);

    // Run master qualification
    const results = await MasterQualificationService.qualifyDomains(
      clientId,
      domainIds,
      {
        targetPageIds,
        locationCode,
        languageCode,
        skipDataForSeo,
        skipAI,
        skipTargetMatching,
        onProgress: (progress) => {
          // Log progress for debugging
          if (progress.stage === 'completed' || progress.stage === 'error') {
            console.log(`Domain ${progress.domain}: ${progress.stage}`);
          }
        }
      }
    );

    // Calculate summary statistics
    const summary = {
      total: results.length,
      completed: results.filter(r => r.stage === 'completed').length,
      errors: results.filter(r => r.stage === 'error').length,
      dataForSeo: {
        success: results.filter(r => r.dataForSeoStatus === 'success').length,
        error: results.filter(r => r.dataForSeoStatus === 'error').length,
        skipped: results.filter(r => r.dataForSeoStatus === 'skipped').length
      },
      ai: {
        success: results.filter(r => r.aiStatus === 'success').length,
        error: results.filter(r => r.aiStatus === 'error').length,
        skipped: results.filter(r => r.aiStatus === 'skipped').length
      },
      qualification: {
        highQuality: results.filter(r => r.qualificationStatus === 'high_quality').length,
        goodQuality: results.filter(r => r.qualificationStatus === 'good_quality').length,
        marginalQuality: results.filter(r => r.qualificationStatus === 'marginal_quality').length,
        disqualified: results.filter(r => r.qualificationStatus === 'disqualified').length
      },
      targetMatching: {
        success: results.filter(r => r.targetMatchStatus === 'success').length,
        error: results.filter(r => r.targetMatchStatus === 'error').length,
        skipped: results.filter(r => r.targetMatchStatus === 'skipped').length,
        withSuggestions: results.filter(r => r.suggestedTargetUrl).length
      }
    };

    return NextResponse.json({
      success: true,
      results,
      summary
    });

  } catch (error: any) {
    console.error('Master qualification error:', error);
    return NextResponse.json(
      { error: 'Failed to run master qualification', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for smart selection filters
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    
    const filters = await MasterQualificationService.getSmartSelectionFilters(clientId);
    
    return NextResponse.json({
      success: true,
      filters
    });

  } catch (error: any) {
    console.error('Error getting smart filters:', error);
    return NextResponse.json(
      { error: 'Failed to get smart filters', details: error.message },
      { status: 500 }
    );
  }
}