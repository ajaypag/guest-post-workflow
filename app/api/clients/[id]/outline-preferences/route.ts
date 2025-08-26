import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { 
  getClientOutlinePreferences, 
  setClientOutlinePreferences,
  type OutlinePreferences 
} from '@/types/outlinePreferences';

/**
 * GET /api/clients/[id]/outline-preferences
 * Get outline preferences for a specific client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const session = await AuthServiceServer.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId)
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account') {
      // Account users can only access their own clients
      if (client.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.userType !== 'internal') {
      // Only internal and account users can access this
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get preferences
    const preferences = getClientOutlinePreferences(client);

    return NextResponse.json({
      preferences: preferences || {
        version: 1,
        enabled: false,
        outlineInstructions: ''
      }
    });

  } catch (error) {
    console.error('Error fetching outline preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outline preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clients/[id]/outline-preferences
 * Update outline preferences for a specific client
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const session = await AuthServiceServer.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId)
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account') {
      // Account users can only edit their own clients
      if (client.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.userType !== 'internal') {
      // Only internal and account users can edit
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences required' },
        { status: 400 }
      );
    }

    // Validate preferences
    if (typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      );
    }

    // Enforce character limit on instructions
    if (preferences.outlineInstructions && preferences.outlineInstructions.length > 2000) {
      return NextResponse.json(
        { error: 'Outline instructions must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Add metadata
    const updatedPreferences: OutlinePreferences = {
      ...preferences,
      version: 1,
      lastUpdated: new Date(),
      updatedBy: session.email || session.userId
    };

    // Update client with new preferences
    const updatedClient = setClientOutlinePreferences(client, updatedPreferences);
    
    // Save to database
    await db.update(clients)
      .set({
        defaultRequirements: updatedClient.defaultRequirements,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId));

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences
    });

  } catch (error) {
    console.error('Error updating outline preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update outline preferences' },
      { status: 500 }
    );
  }
}