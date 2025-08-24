import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * GET /api/clients/[id]/brand-intelligence/latest
 * 
 * Loads the existing brand intelligence session for a client.
 * Used by the UI component on mount to resume existing sessions.
 * 
 * Response:
 * - success: boolean
 * - session: ClientBrandIntelligence | null
 * - error?: string
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get client ID from params
    const { id: clientId } = await params;
    
    // Authenticate user
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query for existing brand intelligence session
    const existingSessions = await db
      .select()
      .from(clientBrandIntelligence)
      .where(eq(clientBrandIntelligence.clientId, clientId))
      .limit(1);

    const session_data = existingSessions[0] || null;

    return NextResponse.json({
      success: true,
      session: session_data
    });

  } catch (error: any) {
    console.error('Error loading brand intelligence session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load brand intelligence session',
        details: error.message
      },
      { status: 500 }
    );
  }
}