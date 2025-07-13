import { NextRequest, NextResponse } from 'next/server';
import { generateKeywords, formatKeywordsForStorage } from '@/lib/services/keywordGenerationService';

export async function POST(request: NextRequest) {
  try {
    const { targetUrl } = await request.json();

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Target URL is required' }, 
        { status: 400 }
      );
    }

    console.log('🟢 Starting keyword generation for:', { targetUrl });

    // Generate keywords using OpenAI
    const result = await generateKeywords(targetUrl);

    if (!result.success) {
      console.error('🔴 Keyword generation failed:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to generate keywords', 
          details: result.error 
        },
        { status: 500 }
      );
    }

    // Format keywords for storage
    const keywordsString = formatKeywordsForStorage(result.keywords);

    console.log('🟢 Keywords generated successfully:', {
      keywordCount: result.keywords.length,
      keywords: result.keywords
    });

    return NextResponse.json({
      success: true,
      keywords: result.keywords,
      keywordsString,
      promptId: result.promptId,
      conversationId: result.conversationId,
      targetUrl
    });

  } catch (error: any) {
    console.error('🔴 Error in keyword generation API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}