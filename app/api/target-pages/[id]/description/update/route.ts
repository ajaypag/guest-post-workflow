import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetPageId } = await params;
    const { description } = await request.json();

    if (!description && description !== '') {
      return NextResponse.json(
        { error: 'Description field is required' }, 
        { status: 400 }
      );
    }

    console.log('🟢 Updating description for target page:', { targetPageId, descriptionLength: description.length });

    // Update the target page description
    const updateSuccess = await ClientService.updateTargetPageDescription(targetPageId, description);

    if (!updateSuccess) {
      console.error('🔴 Failed to update description in database');
      return NextResponse.json(
        { error: 'Failed to update description in database' },
        { status: 500 }
      );
    }

    console.log('✅ Description updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Description updated successfully',
      targetPageId
    });

  } catch (error: any) {
    console.error('🔴 Error in description update API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}