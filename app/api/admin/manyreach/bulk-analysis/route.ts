import { NextRequest, NextResponse } from 'next/server';
import { ManyReachImportV3Enhanced } from '@/lib/services/manyReachImportV3Enhanced';
import { requireInternalUser } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'main';
    const campaignIdsParam = searchParams.get('campaignIds');
    const campaignIds = campaignIdsParam ? campaignIdsParam.split(',') : undefined;

    console.log('🔍 Bulk campaign analysis request:', { workspace, campaignIds });

    const importer = new ManyReachImportV3Enhanced(workspace);
    const analysis = await importer.analyzeBulkCampaigns(campaignIds);

    return NextResponse.json({
      workspace,
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in bulk campaign analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const body = await request.json();
    const { action, workspace = 'main', campaignIds } = body;

    const importer = new ManyReachImportV3Enhanced(workspace);

    if (action === 'import-new-emails') {
      // Import only new emails from selected campaigns
      const results = [];
      
      for (const campaignId of campaignIds) {
        console.log(`📥 Importing new emails from campaign ${campaignId}...`);
        const result = await importer.importCampaignReplies(campaignId);
        results.push({
          ...result
        });
      }

      return NextResponse.json({
        success: true,
        results,
        totalImported: results.reduce((sum, r) => sum + r.imported, 0)
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}