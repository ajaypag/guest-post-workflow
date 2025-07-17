import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin endpoint to view agent diagnostics
 * This helps debug agent text response issues
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        error: 'Session ID is required',
        usage: 'GET /api/admin/agent-diagnostics?sessionId=<session-id>'
      }, { status: 400 });
    }

    // In a real implementation, you'd retrieve stored diagnostics
    // For now, return instructions for viewing console logs
    return NextResponse.json({
      sessionId,
      message: 'Agent diagnostics are logged to console',
      instructions: [
        'Deploy the enhanced retry logic',
        'Run the semantic audit agent',
        'Check server console logs for:',
        '  - 🔍 DIAGNOSTIC EVENT: entries',
        '  - 🚨 DETECTED TEXT-ONLY RESPONSE: entries',
        '  - 📊 AGENT DIAGNOSTICS REPORT: entries',
        '  - 🔄 RETRY ATTEMPT: entries',
        '  - ✅ SUCCESSFUL TOOL CALL: entries'
      ],
      keyLogPatterns: {
        textDetection: '🚨 DETECTED TEXT-ONLY RESPONSE',
        textDelta: '🚨 DETECTED TEXT DELTA',
        malformedTools: '🚨 MALFORMED TOOL CALL',
        retryAttempts: '🔄 RETRY ATTEMPT',
        successfulTools: '✅ SUCCESSFUL TOOL CALL',
        diagnosticEvents: '🔍 DIAGNOSTIC EVENT',
        finalReport: '📊 AGENT DIAGNOSTICS REPORT'
      },
      analysisSteps: [
        '1. Look for "🚨 DETECTED TEXT-ONLY RESPONSE" - this shows when text is detected',
        '2. Check "🔄 RETRY ATTEMPT" - this shows retry logic triggering',
        '3. Find "📊 AGENT DIAGNOSTICS REPORT" - this shows the full event analysis',
        '4. Look for patterns in problematic events',
        '5. Check if retries are working or if agent keeps outputting text'
      ]
    });

  } catch (error) {
    console.error('Error in agent diagnostics endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Test endpoint to simulate agent diagnostics
 */
export async function POST(request: NextRequest) {
  try {
    const { testScenario } = await request.json();

    const testScenarios = {
      textResponse: {
        description: 'Simulates agent outputting text instead of using tools',
        expectedLogs: [
          '🚨 DETECTED TEXT-ONLY RESPONSE',
          '🔄 RETRY ATTEMPT',
          '📊 AGENT DIAGNOSTICS REPORT'
        ]
      },
      textDelta: {
        description: 'Simulates agent outputting text deltas',
        expectedLogs: [
          '🚨 DETECTED TEXT DELTA',
          '🔄 RETRY ATTEMPT'
        ]
      },
      malformedTool: {
        description: 'Simulates malformed tool call JSON',
        expectedLogs: [
          '🚨 MALFORMED TOOL CALL ARGS',
          '🔄 RETRY ATTEMPT'
        ]
      },
      success: {
        description: 'Simulates successful tool usage',
        expectedLogs: [
          '✅ SUCCESSFUL TOOL CALL',
          '🎉 SEMANTIC AUDIT COMPLETED SUCCESSFULLY'
        ]
      }
    };

    const scenario = testScenarios[testScenario as keyof typeof testScenarios];
    
    if (!scenario) {
      return NextResponse.json({
        error: 'Invalid test scenario',
        availableScenarios: Object.keys(testScenarios)
      }, { status: 400 });
    }

    return NextResponse.json({
      testScenario,
      scenario,
      message: 'Test scenario details provided. Run actual agent to see these logs.'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Invalid request body',
      expected: { testScenario: 'textResponse | textDelta | malformedTool | success' }
    }, { status: 400 });
  }
}