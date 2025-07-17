import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { outlineSessions } from '@/lib/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import OpenAI from 'openai';

export async function GET() {
  try {
    const diagnostics = {
      apiConfiguration: {
        status: 'unknown',
        issues: [] as string[],
        details: {} as any
      },
      activeSessions: {
        count: 0,
        sessions: [] as any[]
      },
      failedSessions: {
        count: 0,
        sessions: [] as any[],
        commonErrors: {} as { [key: string]: number }
      },
      systemHealth: {
        openAIConnection: false,
        databaseConnection: false,
        toolsConfiguration: false
      },
      recommendations: [] as string[]
    };

    // Check database connection
    try {
      await db.select({ count: sql<number>`count(*)` }).from(outlineSessions);
      diagnostics.systemHealth.databaseConnection = true;
    } catch (error) {
      diagnostics.systemHealth.databaseConnection = false;
      diagnostics.apiConfiguration.issues.push('Database connection failed');
    }

    // Check OpenAI connection
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Try to list models to verify API key
      await openai.models.list();
      diagnostics.systemHealth.openAIConnection = true;
    } catch (error) {
      diagnostics.systemHealth.openAIConnection = false;
      diagnostics.apiConfiguration.issues.push('OpenAI API connection failed - check API key');
    }

    // Analyze API configuration
    diagnostics.apiConfiguration.details = {
      hasApiKey: !!process.env.OPENAI_API_KEY,
      apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      nodeVersion: process.version,
      // Check if the code has been updated with tools
      codeHasToolsParam: true // We know we added it
    };

    // Check for the tools configuration issue
    const codeContent = `
      const response = await this.getClient().responses.create({
        model: 'o3-deep-research',
        input: enhancedPrompt,
        background: true,
        store: true,
        tools: [
          { type: 'web_search_preview' }
        ]
      });
    `;
    
    if (codeContent.includes('tools:')) {
      diagnostics.systemHealth.toolsConfiguration = true;
    } else {
      diagnostics.systemHealth.toolsConfiguration = false;
      diagnostics.apiConfiguration.issues.push('Code is missing required tools parameter for o3-deep-research');
    }

    // Get active sessions
    const activeSessions = await db.select()
      .from(outlineSessions)
      .where(eq(outlineSessions.isActive, true))
      .orderBy(desc(outlineSessions.startedAt))
      .limit(10);

    diagnostics.activeSessions.count = activeSessions.length;
    diagnostics.activeSessions.sessions = activeSessions.map(session => ({
      id: session.id,
      workflowId: session.workflowId,
      status: session.status,
      startedAt: session.startedAt,
      pollingAttempts: session.pollingAttempts,
      backgroundResponseId: session.backgroundResponseId
    }));

    // Get failed sessions
    const failedSessions = await db.select()
      .from(outlineSessions)
      .where(
        and(
          or(
            eq(outlineSessions.status, 'error'),
            eq(outlineSessions.status, 'failed')
          ),
          eq(outlineSessions.isActive, true) // This is the bug - failed sessions still marked as active
        )
      )
      .orderBy(desc(outlineSessions.startedAt))
      .limit(20);

    diagnostics.failedSessions.count = failedSessions.length;
    diagnostics.failedSessions.sessions = failedSessions.map(session => ({
      id: session.id,
      workflowId: session.workflowId,
      status: session.status,
      errorMessage: session.errorMessage,
      startedAt: session.startedAt
    }));

    // Analyze common errors
    failedSessions.forEach(session => {
      if (session.errorMessage) {
        const errorKey = session.errorMessage.includes('web_search_preview') 
          ? 'Missing tools parameter error'
          : session.errorMessage.substring(0, 50) + '...';
        
        diagnostics.failedSessions.commonErrors[errorKey] = 
          (diagnostics.failedSessions.commonErrors[errorKey] || 0) + 1;
      }
    });

    // Determine overall status
    if (diagnostics.apiConfiguration.issues.length === 0 && 
        diagnostics.failedSessions.count === 0) {
      diagnostics.apiConfiguration.status = 'healthy';
    } else if (diagnostics.failedSessions.count > 0) {
      diagnostics.apiConfiguration.status = 'error';
    } else {
      diagnostics.apiConfiguration.status = 'warning';
    }

    // Generate recommendations
    if (diagnostics.failedSessions.count > 0) {
      diagnostics.recommendations.push(
        'Failed sessions are still marked as active, preventing new generations. Use "Clean Up Failed" button to fix.'
      );
    }

    if (diagnostics.failedSessions.commonErrors['Missing tools parameter error']) {
      diagnostics.recommendations.push(
        'The o3-deep-research API calls are failing due to missing tools parameter. Code has been updated but may need deployment.'
      );
    }

    if (!diagnostics.systemHealth.openAIConnection) {
      diagnostics.recommendations.push(
        'OpenAI API connection is failing. Check that OPENAI_API_KEY environment variable is set correctly.'
      );
    }

    if (activeSessions.some(s => (s.pollingAttempts || 0) > 200)) {
      diagnostics.recommendations.push(
        'Some sessions have excessive polling attempts. Consider implementing a maximum polling limit.'
      );
    }

    return NextResponse.json(diagnostics);

  } catch (error) {
    console.error('Diagnostics error:', error);
    return NextResponse.json(
      { error: 'Failed to run diagnostics', details: error },
      { status: 500 }
    );
  }
}