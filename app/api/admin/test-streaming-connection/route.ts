import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { testPrompt = 'Write a brief test outline for: Testing streaming functionality' } = await request.json();
    
    console.log('🧪 Testing streaming connection...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      apiKeyPresent: false,
      connectionTest: null as any,
      streamingTest: null as any,
      overallStatus: 'unknown' as string
    };
    
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      testResults.apiKeyPresent = false;
      testResults.overallStatus = 'failed';
      return NextResponse.json({
        ...testResults,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }
    
    testResults.apiKeyPresent = true;
    
    // Test basic connection
    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Simple model list test
      const models = await client.models.list();
      testResults.connectionTest = {
        success: true,
        modelCount: models.data.length,
        hasO3Model: models.data.some(m => m.id.includes('o3'))
      };
    } catch (error: any) {
      testResults.connectionTest = {
        success: false,
        error: error.message
      };
      testResults.overallStatus = 'failed';
      return NextResponse.json(testResults, { status: 500 });
    }
    
    // Test streaming response creation
    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const testSessionId = `test-${uuidv4()}`;
      const streamingResults = {
        sessionId: testSessionId,
        responseCreated: false,
        streamReceived: false,
        eventCount: 0,
        contentLength: 0,
        events: [] as any[],
        error: null as any
      };
      
      try {
        // Create streaming response with o3-deep-research
        const response = await client.responses.create({
          model: 'o3-deep-research',
          input: testPrompt,
          background: true,
          stream: true,
          store: true,
          tools: [
            { type: 'web_search_preview' }
          ]
        });
        
        streamingResults.responseCreated = true;
        
        // Test stream consumption (just first few events)
        const maxEvents = 5;
        let eventCount = 0;
        
        for await (const event of response.toStream()) {
          eventCount++;
          streamingResults.eventCount = eventCount;
          
          if (event.delta?.text) {
            streamingResults.streamReceived = true;
            streamingResults.contentLength += event.delta.text.length;
          }
          
          streamingResults.events.push({
            type: event.type,
            hasContent: !!event.delta?.text,
            contentPreview: event.delta?.text ? event.delta.text.substring(0, 50) + '...' : null
          });
          
          // Only test first few events
          if (eventCount >= maxEvents) {
            break;
          }
        }
        
        // Cancel the test stream to avoid costs
        if (response.id) {
          try {
            await client.responses.cancel(response.id);
          } catch (cancelError) {
            // Ignore cancel errors for test
          }
        }
        
      } catch (streamError: any) {
        streamingResults.error = streamError.message;
      }
      
      testResults.streamingTest = streamingResults;
      
      // Determine overall status
      if (streamingResults.responseCreated && streamingResults.streamReceived) {
        testResults.overallStatus = 'success';
      } else if (streamingResults.responseCreated) {
        testResults.overallStatus = 'partial';
      } else {
        testResults.overallStatus = 'failed';
      }
      
    } catch (error: any) {
      testResults.streamingTest = {
        success: false,
        error: error.message
      };
      testResults.overallStatus = 'failed';
    }
    
    return NextResponse.json(testResults);
    
  } catch (error: any) {
    console.error('❌ Streaming connection test error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}