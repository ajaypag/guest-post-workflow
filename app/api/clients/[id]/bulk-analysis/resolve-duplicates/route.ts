import { NextRequest, NextResponse } from 'next/server';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only internal users can resolve duplicates for bulk operations
    if (session.userType !== 'internal') {
      return NextResponse.json({ 
        error: 'Only internal users can perform bulk analysis operations' 
      }, { status: 403 });
    }

    const { id: clientId } = await params;
    const { 
      domains, 
      targetPageIds, 
      manualKeywords, 
      projectId, 
      resolutions,
      airtableMetadata 
    } = await request.json();

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { error: 'Invalid domains provided' },
        { status: 400 }
      );
    }

    if (!targetPageIds || !Array.isArray(targetPageIds)) {
      return NextResponse.json(
        { error: 'Invalid target pages' },
        { status: 400 }
      );
    }

    if (targetPageIds.length === 0 && !manualKeywords) {
      return NextResponse.json(
        { error: 'Either target pages or manual keywords must be provided' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!resolutions || !Array.isArray(resolutions)) {
      return NextResponse.json(
        { error: 'Duplicate resolutions are required' },
        { status: 400 }
      );
    }

    // Use the new resolution method with authenticated user
    const result = await BulkAnalysisService.resolveDuplicatesAndCreate({
      clientId,
      domains,
      targetPageIds,
      manualKeywords,
      projectId,
      userId: session.userId,
      airtableMetadata,
      resolutions
    });

    return NextResponse.json({ 
      success: true,
      domains: result 
    });
  } catch (error: any) {
    console.error('Error resolving duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to resolve duplicates', details: error.message },
      { status: 500 }
    );
  }
}