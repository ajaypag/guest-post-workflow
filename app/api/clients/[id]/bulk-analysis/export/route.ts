import { NextRequest, NextResponse } from 'next/server';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get filter params
    const qualificationStatus = searchParams.get('status') as any;
    const hasWorkflow = searchParams.get('hasWorkflow') === 'true' ? true : 
                       searchParams.get('hasWorkflow') === 'false' ? false : undefined;
    
    const csv = await BulkAnalysisService.exportDomains(
      id,
      {
        qualificationStatus,
        hasWorkflow
      }
    );
    
    // Return CSV with appropriate headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="bulk-analysis-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    console.error('Error exporting domains:', error);
    return NextResponse.json(
      { error: 'Failed to export domains', details: error.message },
      { status: 500 }
    );
  }
}