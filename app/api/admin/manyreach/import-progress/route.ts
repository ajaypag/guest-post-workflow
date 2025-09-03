import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs, manyreachCampaignImports } from '@/lib/db/emailProcessingSchema';
import { eq, and, desc, gte } from 'drizzle-orm';

// In-memory storage for import progress (in production, use Redis or similar)
const importProgressStore = new Map<string, {
  campaignId: string;
  status: 'processing' | 'completed' | 'error';
  processed: number;
  total: number;
  currentEmail?: string;
  message?: string;
  lastUpdate: Date;
}>();

// Clean up old progress entries every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, progress] of importProgressStore.entries()) {
    if (now.getTime() - progress.lastUpdate.getTime() > 10 * 60 * 1000) { // 10 minutes
      importProgressStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const workspace = searchParams.get('workspace') || 'main';

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    const progressKey = `${workspace}:${campaignId}`;
    
    // Check in-memory store first
    const memoryProgress = importProgressStore.get(progressKey);
    if (memoryProgress) {
      return NextResponse.json({ progress: memoryProgress });
    }

    // If not in memory, check database for recent activity
    const recentLogs = await db
      .select({
        total: emailProcessingLogs.id,
      })
      .from(emailProcessingLogs)
      .where(
        and(
          eq(emailProcessingLogs.campaignId, campaignId),
          gte(emailProcessingLogs.createdAt, new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        )
      )
      .limit(1);

    if (recentLogs.length > 0) {
      // Import might be in progress, return estimated progress
      const campaignImport = await db
        .select()
        .from(manyreachCampaignImports)
        .where(
          and(
            eq(manyreachCampaignImports.workspaceName, workspace),
            eq(manyreachCampaignImports.campaignId, campaignId)
          )
        )
        .limit(1);

      if (campaignImport.length > 0) {
        const importData = campaignImport[0];
        return NextResponse.json({
          progress: {
            campaignId,
            status: 'processing',
            processed: importData.totalImported || 0,
            total: importData.totalReplied || 0,
            currentEmail: 'Processing emails...'
          }
        });
      }
    }

    // No progress found
    return NextResponse.json({ progress: null });
  } catch (error) {
    console.error('Error fetching import progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import progress' },
      { status: 500 }
    );
  }
}

// Helper function to update progress (used internally)
function updateImportProgress(
  workspace: string,
  campaignId: string,
  progress: Partial<{
    status: 'processing' | 'completed' | 'error';
    processed: number;
    total: number;
    currentEmail?: string;
    message?: string;
  }>
) {
  const key = `${workspace}:${campaignId}`;
  const existing = importProgressStore.get(key) || {
    campaignId,
    status: 'processing' as const,
    processed: 0,
    total: 0,
    lastUpdate: new Date()
  };

  importProgressStore.set(key, {
    ...existing,
    ...progress,
    lastUpdate: new Date()
  });
}