import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  let previous_response_id: string | undefined;
  let input: string | undefined;
  
  try {
    const body = await request.json();
    previous_response_id = body.previous_response_id;
    input = body.input;

    if (!input || !previous_response_id) {
      return NextResponse.json({ error: 'Input and previous_response_id are required' }, { status: 400 });
    }

    // Initialize OpenAI client inside the function
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Continue conversation using OpenAI Responses API
    // Note: When using previous_response_id, don't include prompt parameter
    const requestBody: any = {
      model: "o3",                    // Model is always required
      input: input,
      reasoning: { effort: "high" },
      store: true
    };
    
    // Only add previous_response_id if it's defined
    if (previous_response_id) {
      requestBody.previous_response_id = previous_response_id;
    }
    
    console.log('Continuing conversation with:', { previous_response_id, input_length: input.length });
    
    const response = await openai.responses.create(requestBody);

    // Calculate token usage and cost (o3 pricing: $2.00 input, $8.00 output per 1M tokens)
    // Note: Response API usage structure may be different - using fallback values
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
      content: response.output_text || 'No content available',
      tokenUsage: tokenUsage,
      model: response.model || 'o3',
      created: response.created_at || Date.now(),
      status: response.status
    });

  } catch (error: any) {
    console.error('Error in AI responses continue:', error);
    console.error('Error status:', error.status);
    console.error('Error body:', error.body);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    
    // Extract more specific error information
    const errorMessage = error.body?.error?.message || error.message || 'Unknown error';
    const errorType = error.body?.error?.type || error.constructor?.name;
    const errorParam = error.body?.error?.param;
    
    return NextResponse.json(
      { 
        error: 'Failed to continue AI conversation', 
        details: errorMessage,
        type: errorType,
        param: errorParam,
        previousResponseId: previous_response_id 
      },
      { status: error.status || 500 }
    );
  }
}