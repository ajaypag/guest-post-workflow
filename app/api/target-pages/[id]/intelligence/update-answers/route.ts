import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * POST /api/target-pages/[id]/intelligence/update-answers
 * 
 * Updates client answers and additional info for target page intelligence
 * Used by internal users to edit client-submitted answers
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetPageId } = await params;
    const { answers, additionalInfo, sessionId } = await request.json();
    
    // Authenticate user
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the target page intelligence session
    const intelligenceResults = await db
      .select()
      .from(targetPageIntelligence)
      .where(eq(targetPageIntelligence.targetPageId, targetPageId))
      .limit(1);

    if (intelligenceResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Target page intelligence session not found' },
        { status: 404 }
      );
    }

    const intelligence = intelligenceResults[0];
    const existingMetadata = intelligence.metadata as any || {};

    // Update the metadata with new answers and additional info
    const updatedMetadata = {
      ...existingMetadata,
      clientAnswers: answers,
      additionalInfo: additionalInfo || existingMetadata.additionalInfo,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: session.userId
    };

    // Also update the main clientInput field for consistency
    const clientInputParts = [];
    
    if (existingMetadata.editedResearch) {
      clientInputParts.push(`EDITED RESEARCH ANALYSIS:\n${existingMetadata.editedResearch}`);
    }
    
    if (additionalInfo || existingMetadata.additionalInfo) {
      clientInputParts.push(`ADDITIONAL TARGET PAGE INFORMATION:\n${additionalInfo || existingMetadata.additionalInfo}`);
    }
    
    if (answers && Object.keys(answers).length > 0) {
      const answersText = Object.values(answers).filter(Boolean).join('\n\n');
      clientInputParts.push(`QUESTION ANSWERS:\n${answersText}`);
    }
    
    const updatedClientInput = clientInputParts.filter(Boolean).join('\n\n--- --- ---\n\n');

    // Update the database
    await db
      .update(targetPageIntelligence)
      .set({
        metadata: updatedMetadata,
        clientInput: updatedClientInput,
        clientInputAt: intelligence.clientInputAt || new Date(), // Keep original timestamp if exists
        updatedAt: new Date()
      })
      .where(eq(targetPageIntelligence.id, intelligence.id));

    console.log(`Target page intelligence answers updated for session: ${intelligence.id}`);

    return NextResponse.json({
      success: true,
      message: 'Answers updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating target page intelligence answers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update answers',
        details: error.message
      },
      { status: 500 }
    );
  }
}