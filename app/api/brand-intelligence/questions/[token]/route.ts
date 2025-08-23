import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence, clients } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createReadableSummary } from '@/lib/utils/textCleanup';

/**
 * GET /api/brand-intelligence/questions/[token]
 * 
 * Public endpoint to retrieve questions for a client using a secure token
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

    // Find brand intelligence session by answer token
    const brandIntelligenceResults = await db
      .select({
        brandIntelligence: clientBrandIntelligence,
        client: clients
      })
      .from(clientBrandIntelligence)
      .innerJoin(clients, eq(clients.id, clientBrandIntelligence.clientId))
      .where(sql`${clientBrandIntelligence.metadata}->>'answerToken' = ${token}`)
      .limit(1);

    if (brandIntelligenceResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    const { brandIntelligence, client } = brandIntelligenceResults[0];
    const researchOutput = brandIntelligence.researchOutput as any;

    if (!researchOutput?.gaps || researchOutput.gaps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No questions available' },
        { status: 404 }
      );
    }

    // Check if questions were already answered
    const metadata = brandIntelligence.metadata as any;
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
      gaps: researchOutput.gaps,
      researchAnalysis: cleanedAnalysis,
      existingAnswers: metadata?.clientAnswers || null
    });

  } catch (error: any) {
    console.error('Error retrieving questions:', error);
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