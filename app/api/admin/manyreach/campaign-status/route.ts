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
    const workspace = searchParams.get('workspace');
    const campaignId = searchParams.get('campaignId');

    console.log('📊 Campaign status request:', { workspace, campaignId });

    try {
      // If workspace is 'all' or not specified, fetch from all workspaces
      if (!workspace || workspace === 'all') {
        // Fetch all active workspaces
        const response = await fetch(`${request.nextUrl.origin}/api/admin/manyreach-keys`, {
          headers: request.headers
        });
        const data = await response.json();
        const activeWorkspaces = (data.workspaces || []).filter((ws: any) => ws.is_active);
        
        // Fetch statuses from all active workspaces in parallel
        const allStatusesPromises = activeWorkspaces.map(async (ws: any) => {
          try {
            const importer = new ManyReachImportV3Enhanced(ws.workspace_name);
            const statuses = await importer.getAllCampaignStatuses();
            // Add workspace info to each status
            return statuses.map(status => ({
              ...status,
              workspace: ws.workspace_name,
              workspaceDisplay: ws.name || ws.workspace_name
            }));
          } catch (error) {
            console.error(`Error fetching status from workspace ${ws.workspace_name}:`, error);
            return [];
          }
        });
        
        const allStatusesNested = await Promise.all(allStatusesPromises);
        const allStatuses = allStatusesNested.flat();
        
        // Sort by new replies (descending) then by name
        allStatuses.sort((a, b) => {
          if (a.newReplies !== b.newReplies) {
            return (b.newReplies || 0) - (a.newReplies || 0);
          }
          return a.campaignName.localeCompare(b.campaignName);
        });

        return NextResponse.json({ 
          workspace: 'all',
          campaigns: allStatuses,
          summary: {
            totalCampaigns: allStatuses.length,
            campaignsWithNewReplies: allStatuses.filter(s => (s.newReplies || 0) > 0).length,
            totalNewReplies: allStatuses.reduce((sum, s) => sum + (s.newReplies || 0), 0),
            totalImported: allStatuses.reduce((sum, s) => sum + s.totalImported, 0),
            totalIgnored: allStatuses.reduce((sum, s) => sum + s.totalIgnored, 0)
          }
        });
      }

      // Single workspace logic
      const importer = new ManyReachImportV3Enhanced(workspace);

      if (campaignId) {
        // Get status for specific campaign
        const status = await importer.getCampaignStatus(campaignId);
        
        if (!status) {
          return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        return NextResponse.json({ status });
      } else {
        // Get status for all campaigns in the workspace
        const statuses = await importer.getAllCampaignStatuses();
        
        // Sort by new replies (descending) then by name
        statuses.sort((a, b) => {
          if (a.newReplies !== b.newReplies) {
            return (b.newReplies || 0) - (a.newReplies || 0);
          }
          return a.campaignName.localeCompare(b.campaignName);
        });

        return NextResponse.json({ 
          workspace,
          campaigns: statuses,
          summary: {
            totalCampaigns: statuses.length,
            campaignsWithNewReplies: statuses.filter(s => (s.newReplies || 0) > 0).length,
            totalNewReplies: statuses.reduce((sum, s) => sum + (s.newReplies || 0), 0),
            totalImported: statuses.reduce((sum, s) => sum + s.totalImported, 0),
            totalIgnored: statuses.reduce((sum, s) => sum + s.totalIgnored, 0)
          }
        });
      }
    } catch (innerError) {
      console.error('Error in campaign status logic:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('Error fetching campaign status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch campaign status' },
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
    const { action, workspace = 'main' } = body;

    const importer = new ManyReachImportV3Enhanced(workspace);

    switch (action) {
      case 'ignore-email': {
        const { email, campaignId, scope, reason } = body;
        
        if (!email) {
          return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        await importer.ignoreEmail(email, campaignId, scope || 'campaign', reason);
        
        return NextResponse.json({ 
          success: true,
          message: `Email ${email} added to ignore list`
        });
      }

      case 'import-new': {
        const { campaignId, sinceDate } = body;
        
        if (!campaignId) {
          return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
        }

        const result = await importer.importCampaignReplies(
          campaignId,
          sinceDate ? new Date(sinceDate) : undefined
        );

        return NextResponse.json({ 
          success: true,
          result
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Campaign status action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}