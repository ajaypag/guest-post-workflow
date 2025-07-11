import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    // Test basic OpenAI connection
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        hasKey: false 
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test if Responses API is available
    try {
      const response = await openai.responses.create({
        prompt: {
          id: "pmpt_68710db9410c8196ab64b7921e7325730317ff998ddbc50b",
          version: "1"
        },
        input: "Hello, this is a test",
        reasoning: {},
        tools: [],
        store: true
      });

      return NextResponse.json({
        success: true,
        message: 'Responses API working',
        responseId: response.id
      });

    } catch (responsesError) {
      // If Responses API fails, try Chat Completions to verify API key works
      try {
        const chatResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 10
        });

        return NextResponse.json({
          success: false,
          message: 'Responses API failed but Chat API works',
          responsesError: responsesError instanceof Error ? responsesError.message : String(responsesError),
          chatWorking: true
        });

      } catch (chatError) {
        return NextResponse.json({
          success: false,
          message: 'Both APIs failed',
          responsesError: responsesError instanceof Error ? responsesError.message : String(responsesError),
          chatError: chatError instanceof Error ? chatError.message : String(chatError)
        });
      }
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}