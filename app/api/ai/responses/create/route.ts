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

    // Use OpenAI Responses API with specific prompt ID
    const response = await openai.responses.create({
      prompt: { 
        id: "pmpt_68710db9410c8196ab64b7921e7325730317ff998ddbc50b" 
      },
      input: input,
      reasoning: { effort: "high" },
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

    // Extract content using correct Responses API structure
    const responseContent = response.output_text || 'No content available';
    
    console.log('Response status:', response.status);
    console.log('Response ID:', response.id);
    console.log('Output text length:', responseContent.length);
    console.log('Full response keys:', Object.keys(response));

    return NextResponse.json({
      id: response.id,
      content: responseContent,
      tokenUsage: tokenUsage,
      model: response.model || 'o3',
      created: response.created_at || Date.now(),
      status: response.status
    });

  } catch (error: any) {
    console.error('Error in AI responses create:', error);
    console.error('Error status:', error.status);
    console.error('Error body:', error.body);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    
    // Extract more specific error information
    const errorMessage = error.body?.error?.message || error.message || 'Unknown error';
    const errorType = error.body?.error?.type || error.constructor?.name;
    const errorParam = error.body?.error?.param;
    
    return NextResponse.json(
      { 
        error: 'Failed to generate AI response', 
        details: errorMessage,
        type: errorType,
        param: errorParam
      },
      { status: error.status || 500 }
    );
  }
}