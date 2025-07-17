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

      // Now test the actual o3-deep-research call
      console.log('Testing o3-deep-research API call...');
      
      result.apiCallDetails = {
        model: 'o3-deep-research',
        background: true,
        store: true,
        tools: [{ type: 'web_search_preview' }],
        inputLength: testPrompt.length
      };

      const response = await openai.responses.create({
        model: 'o3-deep-research',
        input: testPrompt,
        background: true,
        store: true,
        tools: [
          { type: 'web_search_preview' }
        ]
      });

      result.response = {
        id: response.id,
        status: response.status || 'unknown',
        // Only include these if they exist
        ...((response as any).created && { created: (response as any).created }),
        ...((response as any).output && { outputPreview: String((response as any).output).substring(0, 200) + '...' })
      };
      result.success = true;

      console.log('✅ O3 API call successful:', response.id);

      // If it's a background task, we would need to poll for results
      if (response.status === 'queued' || response.status === 'in_progress') {
        result.response.note = 'Background task created successfully. Would need to poll for results.';
      }

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