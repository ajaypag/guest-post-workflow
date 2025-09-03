import { NextRequest, NextResponse } from 'next/server';
import { ManyReachImportV3 } from '@/lib/services/manyReachImportV3';
import { ManyReachImportV3Enhanced } from '@/lib/services/manyReachImportV3Enhanced';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper auth check
    // For now, allow access for testing

    const { campaignId, workspaceName, workspaceId, useEnhanced, sinceDate } = await request.json();
    
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    // Use workspaceName if provided, otherwise fall back to workspaceId for backward compatibility
    const workspace = workspaceName || workspaceId || 'main';
    console.log(`🚀 Starting import for campaign ${campaignId} from workspace ${workspace}`);
    
    // Use enhanced importer if requested (for new features)
    if (useEnhanced) {
      const importer = new ManyReachImportV3Enhanced(workspace);
      const result = await importer.importCampaignReplies(
        campaignId.toString(),
        sinceDate ? new Date(sinceDate) : undefined
      );
      
      return NextResponse.json({ 
        success: true,
        result 
      });
    } else {
      // Use original importer for backward compatibility
      const importer = new ManyReachImportV3(workspace);
      const result = await importer.importCampaignReplies(campaignId.toString());
      
      return NextResponse.json({ 
        success: true,
        result 
      });
    }
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}