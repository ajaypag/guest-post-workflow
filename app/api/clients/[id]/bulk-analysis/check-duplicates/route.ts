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

    // Only internal users can check duplicates for bulk operations
    if (session.userType !== 'internal') {
      return NextResponse.json({ 
        error: 'Only internal users can perform bulk analysis operations' 
      }, { status: 403 });
    }

    const { id: clientId } = await params;
    const { domains, projectId } = await request.json();

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { error: 'Invalid domains provided' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Check for duplicates with detailed information
    const result = await BulkAnalysisService.checkDuplicatesWithDetails(
      clientId,
      domains,
      projectId
    );

    // Debug logging
    console.log('Check duplicates request:', { clientId, projectId, domains });
    console.log('Check duplicates result:', {
      duplicatesCount: result.duplicates.length,
      newDomainsCount: result.newDomains.length,
      alreadyInProjectCount: result.alreadyInProject.length,
      alreadyInProject: result.alreadyInProject
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    
    // Check for specific error types
    if (error.message?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to check duplicates', details: error.message },
      { status: 500 }
    );
  }
}