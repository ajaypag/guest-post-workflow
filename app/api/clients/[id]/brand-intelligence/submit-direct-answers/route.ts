import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * POST /api/clients/[id]/brand-intelligence/submit-direct-answers
 * 
 * Allows authenticated external users to submit answers directly in the app
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { answers, sessionId } = await request.json();
    
    // Authenticate user
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Answers are required' },
        { status: 400 }
      );
    }

    // Get client details and verify access
    const clientResults = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (clientResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    const client = clientResults[0];

    // For external users, verify they have access to this client
    if (session.userType === 'account') {
      if (client.accountId !== session.userId) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this client' },
          { status: 403 }
        );
      }
    }

    // Get brand intelligence session
    const brandIntelligenceResults = await db
      .select()
      .from(clientBrandIntelligence)
      .where(eq(clientBrandIntelligence.clientId, clientId))
      .limit(1);

    if (brandIntelligenceResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No brand intelligence session found' },
        { status: 404 }
      );
    }

    const brandIntelligence = brandIntelligenceResults[0];

    // Update the record with client answers
    const existingMetadata = (brandIntelligence.metadata as any) || {};
    const updatedMetadata = {
      ...existingMetadata,
      clientAnswers: answers,
      answersSubmittedAt: new Date().toISOString(),
      answersSubmittedBy: session.userId
    };

    // Convert answers object to text for the legacy clientInput field
    const answersText = Object.values(answers).join('\n\n');

    await db
      .update(clientBrandIntelligence)
      .set({
        metadata: updatedMetadata,
        clientInput: answersText,
        clientInputAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(clientBrandIntelligence.id, brandIntelligence.id));

    console.log(`Direct answers submitted for client ${clientId} by user ${session.userId}`);

    return NextResponse.json({
      success: true,
      message: 'Answers submitted successfully'
    });

  } catch (error: any) {
    console.error('Error submitting direct answers:', error);
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