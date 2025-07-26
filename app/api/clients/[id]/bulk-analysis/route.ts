import { NextRequest, NextResponse } from 'next/server';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const sortBy = searchParams.get('sortBy') as 'createdAt' | 'domain' | 'qualificationStatus' || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    
    // Get filter params
    const qualificationStatus = searchParams.get('status') as any;
    const hasWorkflow = searchParams.get('hasWorkflow') === 'true' ? true : 
                       searchParams.get('hasWorkflow') === 'false' ? false : undefined;
    const search = searchParams.get('search') || undefined;
    const projectId = searchParams.get('projectId');
    // Special handling for 'null' string to find orphaned domains
    const projectFilter = projectId === 'null' ? null : projectId || undefined;
    
    // Support legacy endpoint without pagination for backward compatibility
    if (!searchParams.get('page')) {
      const domains = await BulkAnalysisService.getClientDomains(id, projectFilter);
      return NextResponse.json({ domains });
    }
    
    // Get paginated results
    const result = await BulkAnalysisService.getPaginatedDomains(
      id,
      page,
      pageSize,
      {
        qualificationStatus,
        hasWorkflow,
        search,
        projectId: projectFilter
      },
      sortBy,
      sortOrder
    );
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching bulk analysis domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domains', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { domains, targetPageIds, manualKeywords, projectId } = await request.json();

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { error: 'Invalid domains provided' },
        { status: 400 }
      );
    }

    // Allow empty targetPageIds array when using manual keywords
    if (!targetPageIds || !Array.isArray(targetPageIds)) {
      return NextResponse.json(
        { error: 'Invalid target pages' },
        { status: 400 }
      );
    }

    // Require either targetPageIds or manualKeywords
    if (targetPageIds.length === 0 && !manualKeywords) {
      return NextResponse.json(
        { error: 'Either target pages or manual keywords must be provided' },
        { status: 400 }
      );
    }

    const result = await BulkAnalysisService.createOrUpdateDomains({
      clientId: id,
      domains,
      targetPageIds,
      manualKeywords,
      projectId,
      userId: 'system' // Placeholder since no auth
    });

    return NextResponse.json({ 
      success: true,
      domains: result 
    });
  } catch (error: any) {
    console.error('Error creating bulk analysis domains:', error);
    return NextResponse.json(
      { error: 'Failed to create domains', details: error.message },
      { status: 500 }
    );
  }
}