import { NextRequest, NextResponse } from 'next/server';
import { generateDescription } from '@/lib/services/descriptionGenerationService';
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

    console.log('🟢 Generating description for target page:', { targetPageId, targetUrl });

    // Generate description using OpenAI
    const result = await generateDescription(targetUrl);

    if (!result.success) {
      console.error('🔴 Description generation failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Description generation failed' },
        { status: 500 }
      );
    }

    console.log('🟢 Description generated successfully:', { 
      descriptionLength: result.description.length,
      promptId: result.promptId 
    });

    // Update the target page with the generated description
    const updateSuccess = await ClientService.updateTargetPageDescription(targetPageId, result.description);

    if (!updateSuccess) {
      console.error('🔴 Failed to save description to database');
      return NextResponse.json(
        { error: 'Failed to save description to database' },
        { status: 500 }
      );
    }

    console.log('✅ Description saved to database successfully');

    return NextResponse.json({
      success: true,
      description: result.description,
      promptId: result.promptId,
      conversationId: result.conversationId,
      targetPageId
    });

  } catch (error: any) {
    console.error('🔴 Error in description generation API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}