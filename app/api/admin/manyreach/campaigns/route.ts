import { NextRequest, NextResponse } from 'next/server';
import { ManyReachAPIClient } from '@/lib/services/manyreach/apiClient';
import { requireInternalUser } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Check authentication - internal users only
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }
    
    const searchParams = request.nextUrl.searchParams;
    const workspaceName = searchParams.get('workspace');
    
    // If no workspace specified or 'all' is specified, fetch from all active workspaces
    if (!workspaceName || workspaceName === 'all') {
      // Fetch all active workspaces
      const response = await fetch(`${request.nextUrl.origin}/api/admin/manyreach-keys`, {
        headers: request.headers
      });
      const data = await response.json();
      const activeWorkspaces = (data.workspaces || []).filter((ws: any) => ws.is_active);
      
      // Fetch campaigns from all active workspaces in parallel
      const allCampaignsPromises = activeWorkspaces.map(async (workspace: any) => {
        try {
          const workspaceId = workspace.workspace_name;
          const apiClient = new ManyReachAPIClient(workspaceId);
          const campaigns = await apiClient.getCampaigns();
          
          // Add workspace info to each campaign
          return campaigns.map(campaign => ({
            ...campaign,
            campaignId: campaign.id || 'unknown',
            campaignName: campaign.name || 'Unknown Campaign',
            totalProspects: campaign.totalProspects || 0,
            repliedProspects: campaign.repliedProspects || 0,
            processed: 0,
            pending: campaign.repliedProspects || 0,
            lastImport: null,
            workspace: workspace.workspace_name,
            workspaceDisplay: workspace.name || workspace.workspace_name
          }));
        } catch (error) {
          console.error(`Error fetching campaigns from workspace ${workspace.workspace_name}:`, error);
          return [];
        }
      });
      
      const allCampaignsNested = await Promise.all(allCampaignsPromises);
      const allCampaigns = allCampaignsNested.flat();
      
      return NextResponse.json({ campaigns: allCampaigns });
    }
    
    // Original single workspace logic
    let workspaceId = workspaceName;
    
    if (workspaceName === 'main') {
      workspaceId = 'workspace-1';
    } else if (!workspaceName.startsWith('workspace-')) {
      workspaceId = workspaceName;
    }
    
    const apiClient = new ManyReachAPIClient(workspaceId);
    const campaigns = await apiClient.getCampaigns();
    
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          if (!campaign.id) {
            console.warn('Campaign missing ID:', campaign);
            return {
              ...campaign,
              campaignId: campaign.id || 'unknown',
              campaignName: campaign.name || 'Unknown Campaign',
              totalProspects: 0,
              repliedProspects: 0,
              processed: 0,
              pending: 0,
              lastImport: null,
              workspace: apiClient.getCurrentWorkspace()?.name
            };
          }
          
          const prospects = await apiClient.getProspects(campaign.id, {
            filterReplied: true,
            limit: 1
          });
          
          return {
            ...campaign,
            campaignId: campaign.id,
            campaignName: campaign.name,
            totalProspects: campaign.totalProspects || 0,
            repliedProspects: campaign.repliedProspects || 0,
            processed: 0,
            pending: campaign.repliedProspects || 0,
            lastImport: null,
            workspace: apiClient.getCurrentWorkspace()?.name
          };
        } catch (error) {
          console.error(`Error fetching stats for campaign ${campaign.id}:`, error);
          return {
            ...campaign,
            campaignId: campaign.id,
            campaignName: campaign.name,
            totalProspects: 0,
            repliedProspects: 0,
            processed: 0,
            pending: 0,
            lastImport: null,
            workspace: apiClient.getCurrentWorkspace()?.name
          };
        }
      })
    );
    
    return NextResponse.json({ campaigns: campaignsWithStats });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}