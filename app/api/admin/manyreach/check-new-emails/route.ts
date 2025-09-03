import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { requireInternalUser } from '@/lib/auth/middleware';
import { ManyReachAPIClient } from '@/lib/integrations/manyreach/api-client';
import { ManyReachApiKeyService } from '@/lib/services/manyreachApiKeyService';

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

    const { searchParams } = new URL(request.url);
    const streaming = searchParams.get('stream') === 'true';

    if (streaming) {
      // Return streaming response
      const stream = new ReadableStream({
        start(controller) {
          processWorkspacesStreaming(controller);
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Get all active workspaces 
    const workspacesResult = await db.execute(sql`
      SELECT DISTINCT workspace_name, is_active
      FROM manyreach_api_keys
      WHERE is_active = true
      ORDER BY workspace_name
    `);
    
    const workspaceRows = (workspacesResult as any).rows || [];
    
    // Get API keys for each workspace
    const workspaces = [];
    for (const row of workspaceRows) {
      const apiKey = await ManyReachApiKeyService.getApiKey(row.workspace_name);
      if (apiKey) {
        workspaces.push({
          workspace_name: row.workspace_name,
          api_key: apiKey,
          is_active: row.is_active
        });
      }
    }
    
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

    // Check each workspace with timeout protection
    for (const workspace of workspaces) {
      try {
        console.log(`🔄 Processing workspace: ${workspace.workspace_name}`);
        const client = new ManyReachAPIClient(workspace.api_key);
        workspacesChecked.push(workspace.workspace_name);
        
        // Get all campaigns from ManyReach API with timeout
        const campaigns = await Promise.race([
          client.getCampaigns(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 30000)
          )
        ]) as any[];
        
        console.log(`📊 Found ${campaigns.length} campaigns in workspace ${workspace.workspace_name}`);
        
        let campaignCount = 0;
        for (const campaign of campaigns) {
          if (campaign.replied_prospects_count === 0) continue;
          
          campaignCount++;
          console.log(`📝 Processing campaign ${campaignCount}: ${campaign.name} (${campaign.id})`);
          
          // Safety limit to prevent infinite processing
          if (campaignCount > 50) {
            console.log(`⚠️ Hit campaign limit for workspace ${workspace.workspace_name}, stopping`);
            break;
          }
          
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
          
          // Get actual prospects and check for real replies
          console.log(`🔍 Checking real replies for campaign ${campaign.name} (${campaign.id})`);
          let realRepliesCount = 0;
          
          try {
            const prospects = await client.getCampaignProspects(campaign.id);
            const repliedProspects = prospects.filter(p => p.replied === true);
            
            console.log(`📊 Campaign ${campaign.name}: ${repliedProspects.length} prospects marked as replied`);
            
            // Check each replied prospect for actual reply messages
            for (const prospect of repliedProspects) {
              try {
                // Skip if already imported
                const existingLog = await db.execute(sql`
                  SELECT id FROM email_processing_logs 
                  WHERE email_from = ${prospect.email} 
                  AND campaign_id = ${campaign.id}
                  LIMIT 1
                `);
                
                if ((existingLog.rows || []).length > 0) {
                  continue; // Already imported, don't count
                }
                
                const messages = await client.getProspectMessages(prospect.email);
                const replyMessages = messages.filter(m => m.type === 'REPLY');
                
                if (replyMessages.length > 0) {
                  realRepliesCount++;
                }
              } catch (error) {
                console.error(`Error checking prospect ${prospect.email}:`, error);
                // Continue with other prospects
              }
            }
          } catch (error) {
            console.error(`Error getting prospects for campaign ${campaign.id}:`, error);
            // Fallback to original estimate
            realRepliesCount = Math.max(0, campaign.replied_prospects_count - importedCount);
          }
          
          console.log(`✅ Campaign ${campaign.name}: ${realRepliesCount} real new replies found`);
          
          const campaignData: CampaignWithNewEmails = {
            workspaceName: workspace.workspace_name,
            campaignId: campaign.id,
            campaignName: campaign.name,
            totalProspects: campaign.prospects_count,
            repliedProspects: campaign.replied_prospects_count,
            lastImportAt: lastImportAt ? new Date(lastImportAt) : undefined,
            currentImportedCount: importedCount,
            estimatedNewEmails: realRepliesCount
          };
          
          // Only add if there are actual new replies
          if (realRepliesCount > 0) {
            // Group by campaign name for duplicate detection
            const key = campaign.name.toLowerCase().trim();
            if (!campaignMap.has(key)) {
              campaignMap.set(key, []);
            }
            campaignMap.get(key)!.push(campaignData);
            allCampaigns.push(campaignData);
          }
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

// Streaming function for real-time progress updates with persistence
async function processWorkspacesStreaming(controller: ReadableStreamDefaultController) {
  let validationRunId: string | null = null;
  const startTime = Date.now();
  
  try {
    const encoder = new TextEncoder();
    
    // Send initial status
    const sendUpdate = (type: string, data: any) => {
      const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
      controller.enqueue(encoder.encode(message));
    };

    // Create validation run record
    const runResult = await db.execute(sql`
      INSERT INTO manyreach_validation_runs (
        status,
        trigger_type,
        triggered_by_user_id
      ) VALUES (
        'running',
        'manual',
        NULL
      )
      RETURNING id
    `);
    
    validationRunId = (runResult.rows?.[0] as any)?.id;
    
    sendUpdate('status', { 
      message: 'Starting workspace analysis...',
      validationRunId 
    });

    // Get all active workspaces 
    const workspacesResult = await db.execute(sql`
      SELECT DISTINCT workspace_name, is_active
      FROM manyreach_api_keys
      WHERE is_active = true
      ORDER BY workspace_name
    `);
    
    const workspaceRows = (workspacesResult as any).rows || [];
    
    // Get API keys for each workspace
    const workspaces = [];
    for (const row of workspaceRows) {
      const apiKey = await ManyReachApiKeyService.getApiKey(row.workspace_name);
      if (apiKey) {
        workspaces.push({
          workspace_name: row.workspace_name,
          api_key: apiKey,
          is_active: row.is_active
        });
      }
    }
    
    if (workspaces.length === 0) {
      sendUpdate('complete', {
        totalNewEmails: 0,
        uniqueCampaigns: 0,
        duplicateCampaigns: 0,
        campaigns: [],
        workspacesChecked: []
      });
      controller.close();
      return;
    }

    sendUpdate('status', { 
      message: `Found ${workspaces.length} workspaces to check`,
      totalWorkspaces: workspaces.length 
    });

    const allCampaigns: CampaignWithNewEmails[] = [];
    const campaignMap = new Map<string, CampaignWithNewEmails[]>();
    const workspacesChecked: string[] = [];

    // Check each workspace
    for (let workspaceIndex = 0; workspaceIndex < workspaces.length; workspaceIndex++) {
      const workspace = workspaces[workspaceIndex];
      
      try {
        sendUpdate('workspace', { 
          workspace: workspace.workspace_name,
          index: workspaceIndex + 1,
          total: workspaces.length,
          message: `Processing workspace: ${workspace.workspace_name}`
        });

        const client = new ManyReachAPIClient(workspace.api_key);
        workspacesChecked.push(workspace.workspace_name);
        
        // Get all campaigns from ManyReach API
        const campaigns = await client.getCampaigns();
        
        sendUpdate('workspace', { 
          workspace: workspace.workspace_name,
          campaignCount: campaigns.length,
          message: `Found ${campaigns.length} campaigns in ${workspace.workspace_name}`
        });
        
        let campaignCount = 0;
        for (const campaign of campaigns) {
          if (campaign.replied_prospects_count === 0) continue;
          
          campaignCount++;
          
          sendUpdate('campaign', {
            workspace: workspace.workspace_name,
            campaign: campaign.name,
            campaignIndex: campaignCount,
            totalCampaigns: campaigns.filter(c => c.replied_prospects_count > 0).length,
            message: `Checking campaign: ${campaign.name}`
          });
          
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
          
          // Get actual prospects and check for real replies
          let realRepliesCount = 0;
          let prospectsChecked = 0;
          const campaignStartTime = Date.now();
          
          try {
            const prospects = await client.getCampaignProspects(campaign.id);
            const repliedProspects = prospects.filter(p => p.replied === true);
            
            sendUpdate('campaign', {
              workspace: workspace.workspace_name,
              campaign: campaign.name,
              prospectCount: repliedProspects.length,
              message: `Found ${repliedProspects.length} replied prospects, validating...`
            });
            
            // Check each replied prospect for actual reply messages
            let checkedCount = 0;
            for (const prospect of repliedProspects) {
              try {
                checkedCount++;
                prospectsChecked = checkedCount;
                
                // Send progress every 5 prospects
                if (checkedCount % 5 === 0) {
                  sendUpdate('prospect', {
                    workspace: workspace.workspace_name,
                    campaign: campaign.name,
                    checked: checkedCount,
                    total: repliedProspects.length,
                    found: realRepliesCount,
                    message: `Validated ${checkedCount}/${repliedProspects.length} prospects (${realRepliesCount} real replies)`
                  });
                }
                
                // Skip if already imported
                const existingLog = await db.execute(sql`
                  SELECT id FROM email_processing_logs 
                  WHERE email_from = ${prospect.email} 
                  AND campaign_id = ${campaign.id}
                  LIMIT 1
                `);
                
                if ((existingLog.rows || []).length > 0) {
                  continue; // Already imported, don't count
                }
                
                const messages = await client.getProspectMessages(prospect.email);
                const replyMessages = messages.filter(m => m.type === 'REPLY');
                
                if (replyMessages.length > 0) {
                  realRepliesCount++;
                }
              } catch (error) {
                console.error(`Error checking prospect ${prospect.email}:`, error);
                // Continue with other prospects
              }
            }
          } catch (error) {
            console.error(`Error getting prospects for campaign ${campaign.id}:`, error);
            // Fallback to original estimate
            realRepliesCount = Math.max(0, campaign.replied_prospects_count - importedCount);
          }
          
          // Log campaign validation result
          if (validationRunId) {
            const campaignProcessingTime = Math.floor((Date.now() - campaignStartTime) / 1000);
            
            try {
              await db.execute(sql`
                INSERT INTO manyreach_campaign_validations (
                  validation_run_id,
                  workspace_name,
                  campaign_id,
                  campaign_name,
                  total_prospects,
                  replied_prospects,
                  real_replies_found,
                  already_imported,
                  prospects_checked,
                  processing_time_seconds,
                  status,
                  campaign_metadata
                ) VALUES (
                  ${validationRunId},
                  ${workspace.workspace_name},
                  ${campaign.id},
                  ${campaign.name},
                  ${campaign.prospects_count},
                  ${campaign.replied_prospects_count},
                  ${realRepliesCount},
                  ${importedCount},
                  ${prospectsChecked},
                  ${campaignProcessingTime},
                  'completed',
                  ${JSON.stringify({
                    campStatus: campaign.campStatus || 'unknown',
                    totalProspects: campaign.prospects_count,
                    repliedCount: campaign.replied_prospects_count
                  })}::jsonb
                )
              `);
            } catch (dbError) {
              console.error('Failed to log campaign validation:', dbError);
            }
          }
          
          const campaignData: CampaignWithNewEmails = {
            workspaceName: workspace.workspace_name,
            campaignId: campaign.id,
            campaignName: campaign.name,
            totalProspects: campaign.prospects_count,
            repliedProspects: campaign.replied_prospects_count,
            lastImportAt: lastImportAt ? new Date(lastImportAt) : undefined,
            currentImportedCount: importedCount,
            estimatedNewEmails: realRepliesCount
          };
          
          // Only add if there are actual new replies
          if (realRepliesCount > 0) {
            // Group by campaign name for duplicate detection
            const key = campaign.name.toLowerCase().trim();
            if (!campaignMap.has(key)) {
              campaignMap.set(key, []);
            }
            campaignMap.get(key)!.push(campaignData);
            allCampaigns.push(campaignData);
            
            sendUpdate('result', {
              campaign: campaignData,
              message: `Found ${realRepliesCount} new replies in ${campaign.name}`
            });
          } else {
            sendUpdate('campaign', {
              workspace: workspace.workspace_name,
              campaign: campaign.name,
              message: `No new replies in ${campaign.name}`
            });
          }
        }
      } catch (error) {
        console.error(`Error checking workspace ${workspace.workspace_name}:`, error);
        sendUpdate('error', {
          workspace: workspace.workspace_name,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: `Error processing workspace ${workspace.workspace_name}`
        });
        // Continue with other workspaces
      }
    }

    // Mark duplicates
    for (const [campaignKey, campaigns] of campaignMap.entries()) {
      if (campaigns.length > 1) {
        campaigns.sort((a, b) => b.currentImportedCount - a.currentImportedCount);
        
        for (let i = 1; i < campaigns.length; i++) {
          campaigns[i].isDuplicate = true;
          campaigns[i].duplicateOf = `${campaigns[0].workspaceName}/${campaigns[0].campaignId}`;
        }
      }
    }

    // Calculate final totals
    const uniqueCampaigns = Array.from(campaignMap.values()).filter(group => group.length > 0).length;
    const duplicateCampaigns = allCampaigns.filter(c => c.isDuplicate).length;
    const totalNewEmails = allCampaigns
      .filter(c => !c.isDuplicate)
      .reduce((sum, c) => sum + c.estimatedNewEmails, 0);

    // Sort campaigns by estimated new emails (descending)
    allCampaigns.sort((a, b) => {
      if (a.isDuplicate !== b.isDuplicate) {
        return a.isDuplicate ? 1 : -1;
      }
      return b.estimatedNewEmails - a.estimatedNewEmails;
    });

    // Update run record with final results
    if (validationRunId) {
      const totalProcessingTime = Math.floor((Date.now() - startTime) / 1000);
      
      try {
        await db.execute(sql`
          UPDATE manyreach_validation_runs
          SET 
            completed_at = NOW(),
            status = 'completed',
            total_workspaces = ${workspaces.length},
            workspaces_processed = ${workspacesChecked.length},
            total_campaigns = ${allCampaigns.length},
            campaigns_processed = ${allCampaigns.length},
            total_new_replies = ${totalNewEmails},
            unique_campaigns = ${uniqueCampaigns},
            duplicate_campaigns = ${duplicateCampaigns},
            processing_time_seconds = ${totalProcessingTime},
            run_summary = ${JSON.stringify({
              workspacesChecked,
              campaignsSummary: allCampaigns.map(c => ({
                workspaceName: c.workspaceName,
                campaignId: c.campaignId,
                campaignName: c.campaignName,
                estimatedNewEmails: c.estimatedNewEmails,
                isDuplicate: c.isDuplicate
              })),
              performance: {
                totalTimeSeconds: totalProcessingTime,
                averageTimePerWorkspace: Math.floor(totalProcessingTime / workspacesChecked.length),
                averageTimePerCampaign: Math.floor(totalProcessingTime / Math.max(allCampaigns.length, 1))
              }
            })}::jsonb
          WHERE id = ${validationRunId}
        `);
      } catch (dbError) {
        console.error('Failed to update validation run:', dbError);
      }
    }

    // Send final results
    sendUpdate('complete', {
      totalNewEmails,
      uniqueCampaigns,
      duplicateCampaigns,
      campaigns: allCampaigns,
      workspacesChecked,
      validationRunId,
      processingTimeSeconds: Math.floor((Date.now() - startTime) / 1000)
    });

  } catch (error) {
    console.error('Error in streaming process:', error);
    
    // Mark run as failed
    if (validationRunId) {
      try {
        const totalProcessingTime = Math.floor((Date.now() - startTime) / 1000);
        await db.execute(sql`
          UPDATE manyreach_validation_runs
          SET 
            completed_at = NOW(),
            status = 'failed',
            processing_time_seconds = ${totalProcessingTime},
            error_message = ${error instanceof Error ? error.message : 'Unknown error'}
          WHERE id = ${validationRunId}
        `);
      } catch (dbError) {
        console.error('Failed to mark run as failed:', dbError);
      }
    }
    
    const encoder = new TextEncoder();
    const errorMessage = `data: ${JSON.stringify({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to process workspaces',
      validationRunId
    })}\n\n`;
    controller.enqueue(encoder.encode(errorMessage));
  } finally {
    controller.close();
  }
}