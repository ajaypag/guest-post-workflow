import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { outlineSessions } from '@/lib/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { agenticOutlineService } from '@/lib/services/agenticOutlineServiceUnified';

export async function GET() {
  try {
    const diagnostics = {
      overallStatus: 'unknown',
      streaming: {
        available: false,
        error: undefined as string | undefined,
        activeConnections: 0
      },
      polling: {
        available: false,
        error: undefined as string | undefined
      },
      database: {
        connected: false,
        error: undefined as string | undefined
      },
      activeSessions: [] as any[],
      metrics: {
        averageStreamingLatency: 0,
        streamingSuccessRate: 0,
        activeConnections: 0,
        fallbackRate: 0
      },
      recommendations: [] as string[]
    };

    // Test database connection
    try {
      await db.select({ count: sql<number>`count(*)` }).from(outlineSessions);
      diagnostics.database.connected = true;
    } catch (error: any) {
      diagnostics.database.connected = false;
      diagnostics.database.error = error.message;
    }

    // Test service health
    try {
      const healthCheck = await agenticOutlineService.healthCheck();
      diagnostics.streaming.available = healthCheck.streaming.available;
      diagnostics.streaming.error = healthCheck.streaming.error;
      diagnostics.polling.available = healthCheck.polling.available;
      diagnostics.polling.error = healthCheck.polling.error;
    } catch (error: any) {
      diagnostics.streaming.error = `Service health check failed: ${error.message}`;
      diagnostics.polling.error = `Service health check failed: ${error.message}`;
    }

    // Get active streaming sessions
    try {
      const activeSessions = await db.select()
        .from(outlineSessions)
        .where(
          and(
            eq(outlineSessions.isActive, true),
            or(
              eq(outlineSessions.status, 'streaming_started'),
              eq(outlineSessions.status, 'in_progress'),
              eq(outlineSessions.status, 'queued')
            )
          )
        )
        .orderBy(desc(outlineSessions.startedAt))
        .limit(20);

      diagnostics.activeSessions = activeSessions.map(session => ({
        id: session.id,
        workflowId: session.workflowId,
        status: session.status,
        connectionStatus: session.connectionStatus || 'unknown',
        lastSequenceNumber: session.lastSequenceNumber || 0,
        startedAt: session.startedAt,
        streamStartedAt: session.streamStartedAt,
        hasPartialContent: !!(session.partialContent && session.partialContent.length > 0)
      }));

      diagnostics.streaming.activeConnections = activeSessions.filter(
        s => s.connectionStatus === 'connected' || s.connectionStatus === 'preparing'
      ).length;

    } catch (error: any) {
      diagnostics.recommendations.push(`Failed to query active sessions: ${error.message}`);
    }

    // Calculate performance metrics
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentSessions = await db.select()
        .from(outlineSessions)
        .where(sql`${outlineSessions.startedAt} > ${last24Hours}`)
        .orderBy(desc(outlineSessions.startedAt))
        .limit(100);

      const streamingSessions = recentSessions.filter(s => 
        s.connectionStatus && s.connectionStatus !== 'unknown'
      );
      
      const completedSessions = recentSessions.filter(s => 
        s.status === 'completed'
      );

      const failedSessions = recentSessions.filter(s => 
        s.status === 'error' || s.status === 'failed'
      );

      // Calculate success rate
      if (recentSessions.length > 0) {
        diagnostics.metrics.streamingSuccessRate = Math.round(
          (completedSessions.length / recentSessions.length) * 100
        );
      }

      // Calculate fallback rate (sessions without streaming features)
      if (recentSessions.length > 0) {
        const nonStreamingSessions = recentSessions.filter(s => 
          !s.connectionStatus || s.connectionStatus === 'unknown'
        );
        diagnostics.metrics.fallbackRate = Math.round(
          (nonStreamingSessions.length / recentSessions.length) * 100
        );
      }

      // Calculate average latency for streaming sessions
      const streamingLatencies = streamingSessions
        .filter(s => s.streamStartedAt && s.startedAt)
        .map(s => new Date(s.streamStartedAt!).getTime() - new Date(s.startedAt).getTime());

      if (streamingLatencies.length > 0) {
        diagnostics.metrics.averageStreamingLatency = Math.round(
          streamingLatencies.reduce((sum, latency) => sum + latency, 0) / streamingLatencies.length
        );
      }

      diagnostics.metrics.activeConnections = diagnostics.streaming.activeConnections;

    } catch (error: any) {
      diagnostics.recommendations.push(`Failed to calculate metrics: ${error.message}`);
    }

    // Determine overall status
    if (diagnostics.database.connected && 
        (diagnostics.streaming.available || diagnostics.polling.available)) {
      diagnostics.overallStatus = 'healthy';
    } else if (diagnostics.polling.available && !diagnostics.streaming.available) {
      diagnostics.overallStatus = 'degraded';
    } else {
      diagnostics.overallStatus = 'unhealthy';
    }

    // Generate recommendations
    if (!diagnostics.database.connected) {
      diagnostics.recommendations.push(
        'Database connection failed. Check connection string and database health.'
      );
    }

    if (!diagnostics.streaming.available && diagnostics.streaming.error) {
      diagnostics.recommendations.push(
        `Streaming service unavailable: ${diagnostics.streaming.error}`
      );
    }

    if (!diagnostics.polling.available && diagnostics.polling.error) {
      diagnostics.recommendations.push(
        `Polling service unavailable: ${diagnostics.polling.error}`
      );
    }

    if (diagnostics.metrics.fallbackRate > 50) {
      diagnostics.recommendations.push(
        `High fallback rate (${diagnostics.metrics.fallbackRate}%). Consider investigating streaming issues.`
      );
    }

    if (diagnostics.metrics.streamingSuccessRate < 80) {
      diagnostics.recommendations.push(
        `Low success rate (${diagnostics.metrics.streamingSuccessRate}%). Review error logs and session failures.`
      );
    }

    if (diagnostics.streaming.activeConnections > 10) {
      diagnostics.recommendations.push(
        `High number of active connections (${diagnostics.streaming.activeConnections}). Monitor resource usage.`
      );
    }

    return NextResponse.json(diagnostics);

  } catch (error) {
    console.error('Streaming diagnostics error:', error);
    return NextResponse.json(
      { error: 'Failed to run streaming diagnostics', details: error },
      { status: 500 }
    );
  }
}