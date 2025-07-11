import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { input, outline_content } = await request.json();

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Initialize OpenAI client inside the function
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use OpenAI Responses API with the correct structure
    const response = await openai.responses.create({
      prompt: {
        id: "pmpt_68710db9410c8196ab64b7921e7325730317ff998ddbc50b",
        version: "1"
      },
      input: input,
      reasoning: {},
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_68710d7858ec8191b829a50012da7707"]
        },
        {
          type: "web_search_preview",
          search_context_size: "medium",
          user_location: {
            type: "approximate",
            city: null,
            country: null,
            region: null,
            timezone: null
          }
        }
      ],
      store: true
    });

    // Calculate token usage and cost (o3 pricing: $2.00 input, $8.00 output per 1M tokens)
    const promptTokens = (response.usage as any)?.input_tokens || (response.usage as any)?.prompt_tokens || 0;
    const completionTokens = (response.usage as any)?.output_tokens || (response.usage as any)?.completion_tokens || 0;
    const totalTokens = (response.usage as any)?.total_tokens || (promptTokens + completionTokens);

    const inputCost = (promptTokens / 1_000_000) * 2.00;
    const outputCost = (completionTokens / 1_000_000) * 8.00;
    const totalCost = inputCost + outputCost;

    const tokenUsage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost: {
        prompt_cost: inputCost,
        completion_cost: outputCost,
        total_cost: totalCost
      }
    };

    return NextResponse.json({
      id: response.id,
      content: (response as any).content || (response as any).message?.content || 'No content available',
      tokenUsage: tokenUsage,
      model: (response as any).model || 'o3',
      created: (response as any).created || Date.now()
    });

  } catch (error) {
    console.error('Error in AI responses create:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: 'Failed to generate AI response', 
        details: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name,
        errorStack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}