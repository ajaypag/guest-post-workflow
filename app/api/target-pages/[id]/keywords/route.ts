import { NextRequest, NextResponse } from 'next/server';
import { generateKeywords, formatKeywordsForStorage } from '@/lib/services/keywordGenerationService';
import { ClientService } from '@/lib/db/clientService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetPageId } = await params;
    const { targetUrl } = await request.json();

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Target URL is required' }, 
        { status: 400 }
      );
    }

    console.log('🟢 Starting keyword generation for target page:', { targetPageId, targetUrl });

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

    // Update the target page with generated keywords
    const updateSuccess = await ClientService.updateTargetPageKeywords(targetPageId, keywordsString);

    if (!updateSuccess) {
      console.error('🔴 Failed to save keywords to database');
      return NextResponse.json(
        { error: 'Failed to save keywords to database' },
        { status: 500 }
      );
    }

    console.log('🟢 Keywords generated and saved successfully:', {
      targetPageId,
      keywordCount: result.keywords.length,
      keywords: result.keywords
    });

    return NextResponse.json({
      success: true,
      keywords: result.keywords,
      keywordsString,
      promptId: result.promptId,
      conversationId: result.conversationId,
      targetPageId
    });

  } catch (error: any) {
    console.error('🔴 Error in target page keyword generation API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}