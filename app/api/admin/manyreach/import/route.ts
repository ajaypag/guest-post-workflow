import { NextRequest, NextResponse } from 'next/server';
import { ManyReachImportV3 } from '@/lib/services/manyReachImportV3';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper auth check
    // For now, allow access for testing

    const { campaignId, workspaceId } = await request.json();
    
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    console.log(`🚀 Starting import for campaign ${campaignId} from workspace ${workspaceId || 'default'}`);
    
    const importer = new ManyReachImportV3(workspaceId);
    const result = await importer.importCampaignReplies(campaignId.toString());
    
    return NextResponse.json({ 
      success: true,
      result 
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}