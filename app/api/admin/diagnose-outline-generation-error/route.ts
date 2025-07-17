import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { outlineSessions, workflows } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflowId, sessionId, errorMessage } = body;

    console.log('🔍 Running comprehensive outline generation error diagnostics...');

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      providedInfo: {
        workflowId,
        sessionId,
        errorMessage,
        errorType: errorMessage?.includes('e.replace is not a function') ? 'SANITIZE_FUNCTION_ERROR' : 'UNKNOWN'
      },
      workflowAnalysis: {},
      sessionAnalysis: {},
      dataTypeChecks: {},
      sanitizationTests: {},
      agentWarnings: {
        hasWarnings: errorMessage?.includes('[Agent] Warning') || false,
        warnings: []
      },
      probableCauses: [],
      recommendedFixes: []
    };

    // Extract agent warnings from error message
    if (errorMessage) {
      const warningMatches = errorMessage.match(/\[Agent\] Warning: ([^\n]+)/g);
      if (warningMatches) {
        diagnostics.agentWarnings.warnings = warningMatches.map((w: string) => w.replace('[Agent] Warning: ', ''));
      }
    }

    // 1. Analyze the workflow data
    if (workflowId) {
      try {
        const workflow = await db.query.workflows.findFirst({
          where: eq(workflows.id, workflowId)
        });

        if (workflow) {
          const content = workflow.content as any;
          const topicStep = content?.steps?.find((s: any) => s.id === 'topic-generation');
          
          diagnostics.workflowAnalysis = {
            found: true,
            hasContent: !!content,
            hasSteps: !!content?.steps,
            topicStepFound: !!topicStep,
            outlinePrompt: {
              exists: !!topicStep?.outputs?.outlinePrompt,
              type: typeof topicStep?.outputs?.outlinePrompt,
              length: topicStep?.outputs?.outlinePrompt?.length || 0,
              preview: topicStep?.outputs?.outlinePrompt?.substring(0, 100) + '...'
            },
            metadata: {
              finalKeyword: {
                exists: !!topicStep?.outputs?.finalKeyword,
                type: typeof topicStep?.outputs?.finalKeyword,
                value: topicStep?.outputs?.finalKeyword
              },
              postTitle: {
                exists: !!topicStep?.outputs?.postTitle,
                type: typeof topicStep?.outputs?.postTitle,
                value: topicStep?.outputs?.postTitle
              },
              clientTargetUrl: {
                exists: !!topicStep?.outputs?.clientTargetUrl,
                type: typeof topicStep?.outputs?.clientTargetUrl,
                value: topicStep?.outputs?.clientTargetUrl
              }
            }
          };
        } else {
          diagnostics.workflowAnalysis = { found: false };
        }
      } catch (err: any) {
        diagnostics.workflowAnalysis = { error: err.message };
      }
    }

    // 2. Analyze the session data if sessionId provided
    if (sessionId) {
      try {
        const session = await db.query.outlineSessions.findFirst({
          where: eq(outlineSessions.id, sessionId)
        });

        if (session) {
          diagnostics.sessionAnalysis = {
            found: true,
            status: session.status,
            version: session.version,
            dataTypes: {
              outlinePrompt: {
                type: typeof session.outlinePrompt,
                isNull: session.outlinePrompt === null,
                length: session.outlinePrompt?.length || 0
              },
              sessionMetadata: {
                type: typeof session.sessionMetadata,
                isNull: session.sessionMetadata === null,
                structure: session.sessionMetadata ? Object.keys(session.sessionMetadata) : []
              },
              agentState: {
                type: typeof session.agentState,
                isNull: session.agentState === null
              }
            },
            timestamps: {
              startedAt: session.startedAt,
              createdAt: session.createdAt,
              updatedAt: session.updatedAt
            }
          };
        } else {
          diagnostics.sessionAnalysis = { found: false };
        }
      } catch (err: any) {
        diagnostics.sessionAnalysis = { error: err.message };
      }
    }

    // 3. Get recent sessions to check for patterns
    try {
      const recentSessions = await db.select({
        id: outlineSessions.id,
        status: outlineSessions.status,
        errorMessage: outlineSessions.errorMessage,
        outlinePromptType: sql<string>`pg_typeof(outline_prompt)`.as('outline_prompt_type'),
        outlinePromptLength: sql<number>`length(outline_prompt::text)`.as('outline_prompt_length'),
        hasNullPrompt: sql<boolean>`outline_prompt IS NULL`.as('has_null_prompt')
      })
      .from(outlineSessions)
      .where(eq(outlineSessions.workflowId, workflowId))
      .orderBy(desc(outlineSessions.createdAt))
      .limit(5);

      diagnostics.recentSessionPatterns = recentSessions;
    } catch (err: any) {
      diagnostics.recentSessionPatterns = { error: err.message };
    }

    // 4. Test sanitization function scenarios
    const testValues = [
      null,
      undefined,
      '',
      'normal string',
      123,
      { test: 'object' },
      ['array'],
      true,
      false
    ];

    diagnostics.sanitizationTests = testValues.map(value => {
      try {
        // Simulate what sanitizeForPostgres would do
        const wouldFail = !value || typeof value !== 'string';
        return {
          input: value,
          inputType: typeof value,
          wouldFailOriginal: wouldFail && !!value, // Original would fail on truthy non-strings
          safeOutput: !value || typeof value !== 'string' ? '' : value
        };
      } catch (err: any) {
        return {
          input: value,
          error: err.message
        };
      }
    });

    // 5. Analyze probable causes based on diagnostics
    if (diagnostics.providedInfo.errorType === 'SANITIZE_FUNCTION_ERROR') {
      diagnostics.probableCauses.push({
        likelihood: 'HIGH',
        cause: 'Non-string value passed to sanitizeForPostgres',
        details: 'The function expects a string but received a different type'
      });

      if (diagnostics.workflowAnalysis.outlinePrompt?.type !== 'string') {
        diagnostics.probableCauses.push({
          likelihood: 'VERY HIGH',
          cause: `Outline prompt is type '${diagnostics.workflowAnalysis.outlinePrompt?.type}' instead of string`,
          details: 'The outline prompt from the workflow is not a string'
        });
      }
    }

    if (diagnostics.agentWarnings.hasWarnings) {
      diagnostics.probableCauses.push({
        likelihood: 'MEDIUM',
        cause: 'Agent handoff type mismatch warnings',
        details: 'Different agents have incompatible output types which may cause data flow issues'
      });
    }

    // 6. Generate specific recommendations
    if (diagnostics.providedInfo.errorType === 'SANITIZE_FUNCTION_ERROR') {
      diagnostics.recommendedFixes.push({
        priority: 'HIGH',
        fix: 'Update sanitizeForPostgres to handle non-string inputs',
        code: `function sanitizeForPostgres(str: any): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/g, '');
}`
      });

      diagnostics.recommendedFixes.push({
        priority: 'MEDIUM',
        fix: 'Add type checking before calling sanitizeForPostgres',
        code: `const safePrompt = typeof outlinePrompt === 'string' ? sanitizeForPostgres(outlinePrompt) : '';`
      });
    }

    if (diagnostics.agentWarnings.warnings.length > 0) {
      diagnostics.recommendedFixes.push({
        priority: 'LOW',
        fix: 'Address agent output type mismatches',
        details: 'Use Agent.create() method for type-safe agent creation'
      });
    }

    // 7. Database column analysis
    try {
      const columnInfo = await db.execute(sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'outline_sessions'
        AND column_name IN ('outline_prompt', 'session_metadata', 'agent_state')
      `);
      
      diagnostics.databaseColumns = columnInfo.rows;
    } catch (err: any) {
      diagnostics.databaseColumns = { error: err.message };
    }

    console.log('✅ Diagnostics completed');

    return NextResponse.json(diagnostics);

  } catch (error: any) {
    console.error('❌ Diagnostic error:', error);
    
    return NextResponse.json({
      error: error.message,
      details: error.stack,
      diagnosticsFailed: true
    }, { status: 500 });
  }
}