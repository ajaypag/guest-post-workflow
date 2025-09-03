import { NextRequest, NextResponse } from 'next/server';
import { ManyReachImportV3 } from '@/lib/services/manyReachImportV3';
import { ManyReachImportV3Enhanced } from '@/lib/services/manyReachImportV3Enhanced';
import { requireInternalUser } from '@/lib/auth/middleware';
import { ImportRecoveryService } from '@/lib/services/importRecovery';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { 
      campaignId, 
      workspaceName, 
      workspaceId, 
      useEnhanced, 
      sinceDate,
      limit,
      onlyReplied,
      previewMode,
      resume = false 
    } = await request.json();
    
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    // Use workspaceName if provided, otherwise fall back to workspaceId for backward compatibility
    const workspace = workspaceName || workspaceId || 'main';
    console.log(`🚀 Starting import for campaign ${campaignId} from workspace ${workspace}`);
    
    // Check if we should resume a previous import
    if (resume) {
      const existingState = await ImportRecoveryService.getState(campaignId.toString(), workspace);
      if (existingState) {
        console.log(`Resuming import from ${existingState.processedCount}/${existingState.totalCount}`);
        return NextResponse.json({
          success: true,
          resuming: true,
          state: existingState
        });
      }
    }
    
    // Preview mode - just return what would be imported
    if (previewMode) {
      return NextResponse.json({
        success: true,
        preview: true,
        result: {
          imported: 0,
          skipped: 0,
          message: 'Preview mode - no data was actually imported'
        }
      });
    }
    
    // Use enhanced importer if requested (for new features)
    let result;
    try {
      if (useEnhanced) {
        const importer = new ManyReachImportV3Enhanced(workspace);
        result = await ImportRecoveryService.retryWithBackoff(async () => {
          return await importer.importCampaignReplies(
            campaignId.toString(),
            sinceDate ? new Date(sinceDate) : undefined
          );
        });
      } else {
        // Use original importer for backward compatibility
        const importer = new ManyReachImportV3(workspace);
        result = await ImportRecoveryService.retryWithBackoff(async () => {
          return await importer.importCampaignReplies(campaignId.toString());
        });
      }
      
      // Mark import as completed
      await ImportRecoveryService.markCompleted(campaignId.toString(), workspace);
      
      return NextResponse.json({ 
        success: true,
        result 
      });
    } catch (error) {
      // Save failed state for recovery
      await ImportRecoveryService.markFailed(
        campaignId.toString(), 
        workspace,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}