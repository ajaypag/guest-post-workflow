import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { requireInternalUser } from '@/lib/auth/middleware';
import { ManyReachAPIClient } from '@/lib/integrations/manyreach/api-client';

interface CampaignWithNewEmails {
  workspaceName: string;
  campaignId: string;
  campaignName: string;
  totalProspects: number;
  repliedProspects: number;
  lastImportAt?: Date;
  currentImportedCount: number;
  estimatedNewEmails: number;
  isDuplicate?: boolean;
  duplicateOf?: string;
}

interface CheckNewEmailsResponse {
  totalNewEmails: number;
  uniqueCampaigns: number;
  duplicateCampaigns: number;
  campaigns: CampaignWithNewEmails[];
  workspacesChecked: string[];
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    // Get all active workspaces with API keys
    const workspacesResult = await db.execute(sql`
      SELECT DISTINCT workspace_name, api_key, is_active
      FROM manyreach_api_keys
      WHERE is_active = true
      ORDER BY workspace_name
    `);
    
    const workspaces = (workspacesResult as any).rows || [];
    
    if (workspaces.length === 0) {
      return NextResponse.json({
        totalNewEmails: 0,
        uniqueCampaigns: 0,
        duplicateCampaigns: 0,
        campaigns: [],
        workspacesChecked: []
      });
    }

    const allCampaigns: CampaignWithNewEmails[] = [];
    const campaignMap = new Map<string, CampaignWithNewEmails[]>();
    const workspacesChecked: string[] = [];

    // Check each workspace
    for (const workspace of workspaces) {
      try {
        const client = new ManyReachAPIClient(workspace.api_key);
        workspacesChecked.push(workspace.workspace_name);
        
        // Get all campaigns from ManyReach API
        const campaigns = await client.getCampaigns();
        
        for (const campaign of campaigns) {
          if (campaign.replied_prospects_count === 0) continue;
          
          // Get import history for this campaign
          const importHistoryResult = await db.execute(sql`
            SELECT 
              COUNT(DISTINCT epl.email_from) as imported_count,
              MAX(epl.created_at) as last_import_at
            FROM email_processing_logs epl
            WHERE epl.campaign_id = ${campaign.id}
              AND epl.campaign_name = ${campaign.name}
          `);
          
          const history = (importHistoryResult as any).rows?.[0] || {};
          const importedCount = parseInt(history.imported_count || 0);
          const lastImportAt = history.last_import_at;
          
          // Estimate new emails (replied count - imported count)
          const estimatedNew = Math.max(0, campaign.replied_prospects_count - importedCount);
          
          const campaignData: CampaignWithNewEmails = {
            workspaceName: workspace.workspace_name,
            campaignId: campaign.id,
            campaignName: campaign.name,
            totalProspects: campaign.prospects_count,
            repliedProspects: campaign.replied_prospects_count,
            lastImportAt: lastImportAt ? new Date(lastImportAt) : undefined,
            currentImportedCount: importedCount,
            estimatedNewEmails: estimatedNew
          };
          
          // Group by campaign name for duplicate detection
          const key = campaign.name.toLowerCase().trim();
          if (!campaignMap.has(key)) {
            campaignMap.set(key, []);
          }
          campaignMap.get(key)!.push(campaignData);
          allCampaigns.push(campaignData);
        }
      } catch (error) {
        console.error(`Error checking workspace ${workspace.workspace_name}:`, error);
        // Continue with other workspaces
      }
    }

    // Mark duplicates - prioritize campaigns with more imported data
    for (const [campaignKey, campaigns] of campaignMap.entries()) {
      if (campaigns.length > 1) {
        // Sort by imported count (descending) to prioritize most processed
        campaigns.sort((a, b) => b.currentImportedCount - a.currentImportedCount);
        
        // Mark all but the first as duplicates
        for (let i = 1; i < campaigns.length; i++) {
          campaigns[i].isDuplicate = true;
          campaigns[i].duplicateOf = `${campaigns[0].workspaceName}/${campaigns[0].campaignId}`;
        }
      }
    }

    // Calculate totals
    const uniqueCampaigns = Array.from(campaignMap.values()).filter(group => group.length > 0).length;
    const duplicateCampaigns = allCampaigns.filter(c => c.isDuplicate).length;
    const totalNewEmails = allCampaigns
      .filter(c => !c.isDuplicate)
      .reduce((sum, c) => sum + c.estimatedNewEmails, 0);

    // Sort campaigns by estimated new emails (descending)
    allCampaigns.sort((a, b) => {
      // Duplicates go to the bottom
      if (a.isDuplicate !== b.isDuplicate) {
        return a.isDuplicate ? 1 : -1;
      }
      // Then sort by new emails
      return b.estimatedNewEmails - a.estimatedNewEmails;
    });

    return NextResponse.json({
      totalNewEmails,
      uniqueCampaigns,
      duplicateCampaigns,
      campaigns: allCampaigns,
      workspacesChecked
    });

  } catch (error) {
    console.error('Error checking for new emails:', error);
    return NextResponse.json(
      { error: 'Failed to check for new emails' },
      { status: 500 }
    );
  }
}

// POST endpoint to import all new emails
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { onlyUnique = true } = await request.json();

    // First, get the list of campaigns with new emails
    const checkResponse = await GET(request);
    const checkData = await checkResponse.json();
    
    if (!checkData.campaigns || checkData.campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new emails to import',
        imported: 0,
        skipped: 0
      });
    }

    let totalImported = 0;
    let totalSkipped = 0;
    const results: any[] = [];

    // Import from each campaign
    for (const campaign of checkData.campaigns) {
      // Skip duplicates if onlyUnique is true
      if (onlyUnique && campaign.isDuplicate) {
        totalSkipped += campaign.estimatedNewEmails;
        continue;
      }

      if (campaign.estimatedNewEmails === 0) {
        continue;
      }

      try {
        // Import new emails from this campaign
        const importResponse = await fetch(
          `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/manyreach/campaign-status`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'import-new',
              workspace: campaign.workspaceName,
              campaignId: campaign.campaignId,
              sinceDate: campaign.lastImportAt?.toISOString()
            })
          }
        );

        if (importResponse.ok) {
          const importResult = await importResponse.json();
          totalImported += importResult.result?.imported || 0;
          totalSkipped += importResult.result?.skipped || 0;
          
          results.push({
            campaign: campaign.campaignName,
            workspace: campaign.workspaceName,
            imported: importResult.result?.imported || 0,
            skipped: importResult.result?.skipped || 0
          });
        }
      } catch (error) {
        console.error(`Error importing campaign ${campaign.campaignName}:`, error);
        // Continue with other campaigns
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import complete: ${totalImported} emails imported, ${totalSkipped} skipped`,
      imported: totalImported,
      skipped: totalSkipped,
      details: results
    });

  } catch (error) {
    console.error('Error importing new emails:', error);
    return NextResponse.json(
      { error: 'Failed to import new emails' },
      { status: 500 }
    );
  }
}