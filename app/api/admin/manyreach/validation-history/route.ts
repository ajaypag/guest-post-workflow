import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { requireInternalUser } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get validation run history
    const runsResult = await db.execute(sql`
      SELECT 
        vr.id,
        vr.started_at,
        vr.completed_at,
        vr.status,
        vr.total_workspaces,
        vr.workspaces_processed,
        vr.total_campaigns,
        vr.campaigns_processed,
        vr.total_new_replies,
        vr.unique_campaigns,
        vr.duplicate_campaigns,
        vr.processing_time_seconds,
        vr.trigger_type,
        vr.error_message,
        vr.run_summary,
        -- Count of campaign validations for this run
        COUNT(cv.id) as campaign_validations_count,
        -- Sum of real replies found in this run
        COALESCE(SUM(cv.real_replies_found), 0) as total_real_replies_found,
        -- Sum of prospects checked in this run
        COALESCE(SUM(cv.prospects_checked), 0) as total_prospects_checked
      FROM manyreach_validation_runs vr
      LEFT JOIN manyreach_campaign_validations cv ON vr.id = cv.validation_run_id
      GROUP BY vr.id, vr.started_at, vr.completed_at, vr.status, 
               vr.total_workspaces, vr.workspaces_processed, vr.total_campaigns,
               vr.campaigns_processed, vr.total_new_replies, vr.unique_campaigns,
               vr.duplicate_campaigns, vr.processing_time_seconds, vr.trigger_type,
               vr.error_message, vr.run_summary
      ORDER BY vr.started_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const runs = (runsResult as any).rows || [];

    // Get overall stats
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_runs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_runs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_runs,
        AVG(CASE WHEN status = 'completed' THEN processing_time_seconds END) as avg_processing_time,
        SUM(CASE WHEN status = 'completed' THEN total_new_replies ELSE 0 END) as total_replies_found,
        MAX(started_at) as last_run_at
      FROM manyreach_validation_runs
      WHERE started_at >= NOW() - INTERVAL '30 days'
    `);

    const stats = (statsResult as any).rows?.[0] || {};

    return NextResponse.json({
      runs: runs.map((run: any) => ({
        id: run.id,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        status: run.status,
        totalWorkspaces: run.total_workspaces,
        workspacesProcessed: run.workspaces_processed,
        totalCampaigns: run.total_campaigns,
        campaignsProcessed: run.campaigns_processed,
        totalNewReplies: run.total_new_replies,
        uniqueCampaigns: run.unique_campaigns,
        duplicateCampaigns: run.duplicate_campaigns,
        processingTimeSeconds: run.processing_time_seconds,
        triggerType: run.trigger_type,
        errorMessage: run.error_message,
        runSummary: run.run_summary,
        campaignValidationsCount: parseInt(run.campaign_validations_count),
        totalRealRepliesFound: parseInt(run.total_real_replies_found),
        totalProspectsChecked: parseInt(run.total_prospects_checked)
      })),
      stats: {
        totalRuns: parseInt(stats.total_runs || 0),
        completedRuns: parseInt(stats.completed_runs || 0),
        failedRuns: parseInt(stats.failed_runs || 0),
        runningRuns: parseInt(stats.running_runs || 0),
        averageProcessingTime: parseFloat(stats.avg_processing_time || 0),
        totalRepliesFound: parseInt(stats.total_replies_found || 0),
        lastRunAt: stats.last_run_at
      },
      pagination: {
        limit,
        offset,
        hasMore: runs.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching validation history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validation history' },
      { status: 500 }
    );
  }
}

// Get detailed information about a specific validation run
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { runId } = await request.json();

    if (!runId) {
      return NextResponse.json(
        { error: 'Run ID is required' },
        { status: 400 }
      );
    }

    // Get run details
    const runResult = await db.execute(sql`
      SELECT *
      FROM manyreach_validation_runs
      WHERE id = ${runId}
    `);

    const run = (runResult as any).rows?.[0];

    if (!run) {
      return NextResponse.json(
        { error: 'Validation run not found' },
        { status: 404 }
      );
    }

    // Get campaign validations for this run
    const campaignsResult = await db.execute(sql`
      SELECT 
        cv.*,
        -- Check if this campaign has been processed in later runs
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM manyreach_campaign_validations cv2 
            WHERE cv2.campaign_id = cv.campaign_id 
            AND cv2.workspace_name = cv.workspace_name
            AND cv2.validated_at > cv.validated_at
          ) THEN TRUE ELSE FALSE 
        END as has_later_validation
      FROM manyreach_campaign_validations cv
      WHERE cv.validation_run_id = ${runId}
      ORDER BY cv.validated_at ASC
    `);

    const campaigns = (campaignsResult as any).rows || [];

    return NextResponse.json({
      run: {
        id: run.id,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        status: run.status,
        totalWorkspaces: run.total_workspaces,
        workspacesProcessed: run.workspaces_processed,
        totalCampaigns: run.total_campaigns,
        campaignsProcessed: run.campaigns_processed,
        totalNewReplies: run.total_new_replies,
        uniqueCampaigns: run.unique_campaigns,
        duplicateCampaigns: run.duplicate_campaigns,
        processingTimeSeconds: run.processing_time_seconds,
        triggerType: run.trigger_type,
        errorMessage: run.error_message,
        runSummary: run.run_summary
      },
      campaigns: campaigns.map((campaign: any) => ({
        id: campaign.id,
        workspaceName: campaign.workspace_name,
        campaignId: campaign.campaign_id,
        campaignName: campaign.campaign_name,
        totalProspects: campaign.total_prospects,
        repliedProspects: campaign.replied_prospects,
        realRepliesFound: campaign.real_replies_found,
        alreadyImported: campaign.already_imported,
        prospectsChecked: campaign.prospects_checked,
        processingTimeSeconds: campaign.processing_time_seconds,
        validatedAt: campaign.validated_at,
        status: campaign.status,
        errorMessage: campaign.error_message,
        isDuplicate: campaign.is_duplicate,
        duplicateOf: campaign.duplicate_of,
        campaignMetadata: campaign.campaign_metadata,
        hasLaterValidation: campaign.has_later_validation
      }))
    });

  } catch (error) {
    console.error('Error fetching validation run details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validation run details' },
      { status: 500 }
    );
  }
}