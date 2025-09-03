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
    const campaignId = searchParams.get('campaignId');
    const workspace = searchParams.get('workspace') || 'main';

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID required' },
        { status: 400 }
      );
    }

    // Get import progress by counting drafts for this campaign
    const progressQuery = sql`
      SELECT 
        COUNT(*) as total_imported,
        SUM(CASE WHEN pd.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN pd.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN pd.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        MAX(pd.created_at) as last_import_at
      FROM publisher_drafts pd
      INNER JOIN email_processing_logs epl ON pd.email_log_id = epl.id
      WHERE epl.campaign_name ILIKE ${`%${campaignId}%`}
    `;

    const result = await db.execute(progressQuery);
    const progress = (result as any).rows?.[0] || {};

    // Return progress in expected format
    return NextResponse.json({
      progress: {
        campaignId,
        status: 'completed', // Since we're just checking existing data
        processed: parseInt(progress.total_imported || 0),
        total: parseInt(progress.total_imported || 0),
        pending: parseInt(progress.pending_count || 0),
        approved: parseInt(progress.approved_count || 0),
        rejected: parseInt(progress.rejected_count || 0),
        lastImportAt: progress.last_import_at,
        message: `Found ${progress.total_imported || 0} drafts`
      }
    });

  } catch (error) {
    console.error('Error fetching import progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import progress' },
      { status: 500 }
    );
  }
}