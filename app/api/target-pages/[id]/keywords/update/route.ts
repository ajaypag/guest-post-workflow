import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetPageId } = await params;
    const { keywords } = await request.json();

    if (!keywords && keywords !== '') {
      return NextResponse.json(
        { error: 'Keywords field is required' }, 
        { status: 400 }
      );
    }

    console.log('🟢 Updating keywords for target page:', { targetPageId, keywordsLength: keywords.length });

    // Update the target page keywords
    const updateSuccess = await ClientService.updateTargetPageKeywords(targetPageId, keywords);

    if (!updateSuccess) {
      console.error('🔴 Failed to update keywords in database');
      return NextResponse.json(
        { error: 'Failed to update keywords in database' },
        { status: 500 }
      );
    }

    console.log('✅ Keywords updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Keywords updated successfully',
      targetPageId
    });

  } catch (error: any) {
    console.error('🔴 Error in keywords update API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}