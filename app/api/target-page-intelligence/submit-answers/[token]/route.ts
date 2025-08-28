import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq, sql } from 'drizzle-orm';

/**
 * POST /api/target-page-intelligence/submit-answers/[token]
 * 
 * Public endpoint to submit answers for target page intelligence questions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { answers, editedResearch, additionalInfo } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Answers are required' },
        { status: 400 }
      );
    }

    // Find target page intelligence session by answer token
    const intelligenceResults = await db
      .select()
      .from(targetPageIntelligence)
      .where(sql`${targetPageIntelligence.metadata}->>'answerToken' = ${token}`)
      .limit(1);

    if (intelligenceResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    const intelligence = intelligenceResults[0];

    // Check if questions were already answered
    const metadata = intelligence.metadata as any;
    if (metadata?.answersSubmittedAt) {
      return NextResponse.json(
        { success: false, error: 'Questions have already been answered' },
        { status: 410 }
      );
    }

    // Update the record with client answers and edited research
    const updatedMetadata = {
      ...metadata,
      clientAnswers: answers,
      editedResearch: editedResearch || '',
      additionalInfo: additionalInfo || '',
      answersSubmittedAt: new Date().toISOString()
    };

    await db
      .update(targetPageIntelligence)
      .set({
        metadata: updatedMetadata,
        clientInput: [
          editedResearch ? `EDITED RESEARCH ANALYSIS:\n${editedResearch}` : '',
          additionalInfo ? `ADDITIONAL TARGET PAGE INFORMATION:\n${additionalInfo}` : '',
          `QUESTION ANSWERS:\n${Object.values(answers).join('\n\n')}`
        ].filter(Boolean).join('\n\n--- --- ---\n\n'), // Comprehensive format for legacy field
        clientInputAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(targetPageIntelligence.id, intelligence.id));

    console.log(`Client answers submitted for target page intelligence session: ${intelligence.id}`);

    return NextResponse.json({
      success: true,
      message: 'Answers submitted successfully'
    });

  } catch (error: any) {
    console.error('Error submitting target page intelligence answers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit answers',
        details: error.message
      },
      { status: 500 }
    );
  }
}