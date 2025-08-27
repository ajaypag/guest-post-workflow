import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * GET /api/target-pages/[id]/intelligence/latest
 * 
 * Loads the existing target page intelligence session for a target page.
 * Used by the UI component on mount to resume existing sessions.
 * 
 * Response:
 * - success: boolean
 * - session: TargetPageIntelligence | null
 * - error?: string
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get target page ID from params
    const { id: targetPageId } = await params;
    
    // Authenticate user
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query for existing target page intelligence session
    const existingSessions = await db
      .select()
      .from(targetPageIntelligence)
      .where(eq(targetPageIntelligence.targetPageId, targetPageId))
      .limit(1);

    const session_data = existingSessions[0] || null;

    return NextResponse.json({
      success: true,
      session: session_data
    });

  } catch (error: any) {
    console.error('Error loading target page intelligence session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load target page intelligence session',
        details: error.message
      },
      { status: 500 }
    );
  }
}