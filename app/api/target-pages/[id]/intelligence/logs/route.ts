import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { intelligenceGenerationLogs } from '@/lib/db/intelligenceLogsSchema';
import { targetPages, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * GET /api/target-pages/[id]/intelligence/logs
 * 
 * Retrieves all intelligence generation logs for a specific target page
 * Shows complete history of all attempts (successful, failed, cancelled)
 * 
 * Query params:
 * - limit: number (default 50)
 * - offset: number (default 0)
 * 
 * Response:
 * - logs: array of log entries
 * - total: total number of logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetPageId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Authenticate user
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the target page exists
    const targetPageResult = await db
      .select()
      .from(targetPages)
      .where(eq(targetPages.id, targetPageId))
      .limit(1);

    if (targetPageResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Target page not found' },
        { status: 404 }
      );
    }

    // Fetch logs with user info
    const logs = await db
      .select({
        id: intelligenceGenerationLogs.id,
        sessionType: intelligenceGenerationLogs.sessionType,
        openaiSessionId: intelligenceGenerationLogs.openaiSessionId,
        startedAt: intelligenceGenerationLogs.startedAt,
        completedAt: intelligenceGenerationLogs.completedAt,
        durationSeconds: intelligenceGenerationLogs.durationSeconds,
        status: intelligenceGenerationLogs.status,
        errorMessage: intelligenceGenerationLogs.errorMessage,
        errorDetails: intelligenceGenerationLogs.errorDetails,
        outputSize: intelligenceGenerationLogs.outputSize,
        tokensUsed: intelligenceGenerationLogs.tokensUsed,
        metadata: intelligenceGenerationLogs.metadata,
        userType: intelligenceGenerationLogs.userType,
        createdAt: intelligenceGenerationLogs.createdAt,
        // Join user info
        initiatedByName: users.name,
        initiatedByEmail: users.email,
      })
      .from(intelligenceGenerationLogs)
      .leftJoin(users, eq(intelligenceGenerationLogs.initiatedBy, users.id))
      .where(eq(intelligenceGenerationLogs.targetPageId, targetPageId))
      .orderBy(desc(intelligenceGenerationLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: intelligenceGenerationLogs.id })
      .from(intelligenceGenerationLogs)
      .where(eq(intelligenceGenerationLogs.targetPageId, targetPageId));
    
    const total = countResult.length;

    // Calculate stats
    const stats = {
      totalAttempts: total,
      successful: logs.filter(l => l.status === 'completed').length,
      failed: logs.filter(l => l.status === 'failed').length,
      cancelled: logs.filter(l => l.status === 'cancelled').length,
      inProgress: logs.filter(l => l.status === 'in_progress').length,
      averageDuration: logs
        .filter(l => l.status === 'completed' && l.durationSeconds)
        .reduce((acc, l) => acc + (l.durationSeconds || 0), 0) / 
        (logs.filter(l => l.status === 'completed' && l.durationSeconds).length || 1)
    };

    return NextResponse.json({
      success: true,
      logs,
      total,
      stats,
      targetPage: {
        id: targetPageResult[0].id,
        url: targetPageResult[0].url,
        domain: targetPageResult[0].domain
      }
    });

  } catch (error: any) {
    console.error('Error fetching intelligence logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch logs',
        details: error.message
      },
      { status: 500 }
    );
  }
}