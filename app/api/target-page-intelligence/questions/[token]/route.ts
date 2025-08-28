import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPages, clients } from '@/lib/db/schema';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq, sql } from 'drizzle-orm';
import { createReadableSummary } from '@/lib/utils/textCleanup';

/**
 * GET /api/target-page-intelligence/questions/[token]
 * 
 * Public endpoint to retrieve questions for a target page using a secure token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find target page intelligence session by answer token
    const intelligenceResults = await db
      .select({
        intelligence: targetPageIntelligence,
        client: clients,
        targetPage: targetPages
      })
      .from(targetPageIntelligence)
      .innerJoin(clients, eq(clients.id, targetPageIntelligence.clientId))
      .innerJoin(targetPages, eq(targetPages.id, targetPageIntelligence.targetPageId))
      .where(sql`${targetPageIntelligence.metadata}->>'answerToken' = ${token}`)
      .limit(1);

    if (intelligenceResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    const { intelligence, client, targetPage } = intelligenceResults[0];
    const researchOutput = intelligence.researchOutput as any;

    if (!researchOutput?.gaps || researchOutput.gaps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No questions available' },
        { status: 404 }
      );
    }

    // Check if questions were already answered
    const metadata = intelligence.metadata as any;
    if (metadata?.answersSubmittedAt) {
      return NextResponse.json(
        { success: false, error: 'Questions have already been answered' },
        { status: 410 }
      );
    }

    // Clean up the research analysis for better readability
    const cleanedAnalysis = createReadableSummary(researchOutput);

    return NextResponse.json({
      success: true,
      client: {
        name: client.name,
        website: client.website
      },
      targetPage: {
        url: targetPage.url,
        title: targetPage.url // Use URL as title since title field doesn't exist
      },
      gaps: researchOutput.gaps,
      researchAnalysis: cleanedAnalysis,
      existingAnswers: metadata?.clientAnswers || null
    });

  } catch (error: any) {
    console.error('Error retrieving target page intelligence questions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve questions',
        details: error.message
      },
      { status: 500 }
    );
  }
}