import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { conversation_id, input } = await request.json();

    if (!input || !conversation_id) {
      return NextResponse.json({ error: 'Input and conversation_id are required' }, { status: 400 });
    }

    // Initialize OpenAI client inside the function
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Continue conversation using OpenAI Responses API with correct structure
    const response = await openai.responses.create({
      model: "o3",
      input: input,
      conversation_id: conversation_id,
      instructions: "You are a helpful assistant specialized in creating high-quality guest post content. Use the provided research and guidelines to create engaging, well-structured articles.",
      reasoning: { effort: "high" },
      store: true
    });

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
      conversationId: response.conversation_id,
      status: response.status
    });

  } catch (error) {
    console.error('Error in AI responses continue:', error);
    return NextResponse.json(
      { error: 'Failed to continue AI conversation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}