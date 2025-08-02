import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { inArray, eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { clientIds } = await request.json();

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'No clients selected' },
        { status: 400 }
      );
    }

    const shareLinks = [];
    const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin');

    // Generate share tokens for each client
    for (const clientId of clientIds) {
      const shareToken = crypto.randomBytes(32).toString('base64url');
      
      // Update client with share token
      await db
        .update(clients)
        .set({ 
          shareToken: sql`${shareToken}`,
          updatedAt: new Date() 
        })
        .where(eq(clients.id, clientId));

      // Get client info for the response
      const [client] = await db
        .select({ name: clients.name })
        .from(clients)
        .where(eq(clients.id, clientId));

      shareLinks.push({
        clientId,
        clientName: client?.name || 'Unknown',
        shareToken,
        shareUrl: `${baseUrl}/claim/client?token=${shareToken}`
      });
    }

    return NextResponse.json({ 
      success: true,
      generated: shareLinks.length,
      shareLinks,
      message: `Generated share links for ${shareLinks.length} clients`
    });

  } catch (error) {
    console.error('Error generating share links:', error);
    return NextResponse.json(
      { error: 'Failed to generate share links' },
      { status: 500 }
    );
  }
}