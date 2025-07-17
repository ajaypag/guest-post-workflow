import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { testPrompt } = await request.json();
    
    console.log('🧪 Testing O3 API call with proper configuration...');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const result = {
      testStarted: new Date().toISOString(),
      prompt: testPrompt,
      apiCallDetails: {} as any,
      response: null as any,
      error: null as any,
      success: false
    };

    try {
      // First, verify we can access the API
      console.log('Verifying API access...');
      const models = await openai.models.list();
      console.log('✅ API access verified');

      // IMPORTANT: Not making actual API call to save credits
      console.log('⚠️ Skipping actual o3-deep-research API call to save credits');
      
      result.apiCallDetails = {
        model: 'o3-deep-research',
        background: true,
        store: true,
        tools: [{ type: 'web_search_preview' }],
        inputLength: testPrompt.length,
        NOTE: 'ACTUAL API CALL SKIPPED TO SAVE CREDITS'
      };

      // Simulate what the call would look like
      result.response = {
        simulatedCall: true,
        wouldHaveCalled: {
          model: 'o3-deep-research',
          input: testPrompt.substring(0, 50) + '...',
          background: true,
          store: true,
          tools: [{ type: 'web_search_preview' }]
        },
        note: 'This is a configuration check only. No actual API call was made to save credits.'
      };
      result.success = true;

      console.log('✅ Configuration check complete (no API call made)');

    } catch (apiError: any) {
      console.error('❌ O3 API call failed:', apiError);
      
      result.error = {
        message: apiError.message,
        type: apiError.constructor.name,
        status: apiError.status,
        code: apiError.code,
        // Extract the specific error about tools if present
        requiresTools: apiError.message?.includes('web_search_preview'),
        fullError: apiError.toString()
      };

      // Check if this is the specific tools error
      if (apiError.message?.includes('Deep research models require')) {
        result.error.diagnosis = 'The API is rejecting the call because tools parameter is missing or incorrect';
        result.error.solution = 'Ensure tools: [{ type: "web_search_preview" }] is included in the API call';
      }
    }

    // Add diagnostic information
    const diagnostics = {
      environmentCheck: {
        hasApiKey: !!process.env.OPENAI_API_KEY,
        apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...',
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      },
      recommendations: [] as string[]
    };

    if (!result.success && result.error?.requiresTools) {
      diagnostics.recommendations.push(
        'The API call failed with tools requirement error',
        'Verify that the latest code with tools parameter is deployed',
        'Check that the OpenAI API key has access to o3-deep-research model'
      );
    }

    return NextResponse.json({
      ...result,
      diagnostics
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Test endpoint failed', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}