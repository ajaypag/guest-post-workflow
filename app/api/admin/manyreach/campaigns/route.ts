import { NextRequest, NextResponse } from 'next/server';
import { ManyReachAPIClient } from '@/lib/services/manyreach/apiClient';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper auth check
    // For now, allow access for testing
    
    const searchParams = request.nextUrl.searchParams;
    const workspaceName = searchParams.get('workspace') || 'main';
    
    // For workspace names like "workspace-11", use them directly as IDs
    // For named workspaces like "main", map them
    let workspaceId = workspaceName;
    
    if (workspaceName === 'main') {
      workspaceId = 'workspace-1';
    } else if (!workspaceName.startsWith('workspace-')) {
      // If it's a custom name, just use it as-is
      // The WorkspaceManager will handle the API key lookup
      workspaceId = workspaceName;
    }
    
    // Create API client with selected workspace
    const apiClient = new ManyReachAPIClient(workspaceId);
    
    // Get campaigns from the selected workspace
    const campaigns = await apiClient.getCampaigns();
    
    // Get import stats for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          // Check if campaign has valid ID
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
          
          // Get replied prospects count
          const prospects = await apiClient.getProspects(campaign.id, {
            filterReplied: true,
            limit: 1 // Just to get count
          });
          
          return {
            ...campaign,
            campaignId: campaign.id,
            campaignName: campaign.name,
            totalProspects: campaign.totalProspects || 0,
            repliedProspects: campaign.repliedProspects || 0,
            processed: 0, // Would need to check database for this
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