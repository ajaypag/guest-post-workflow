import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { token } = data;
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }
    
    // Find client with this share token
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.shareToken, token),
        isNull(clients.accountId) // Only claimable if not already claimed
      ),
    });
    
    if (!client) {
      // Check if token exists but already claimed
      const claimedClient = await db.query.clients.findFirst({
        where: eq(clients.shareToken, token),
      });
      
      if (claimedClient) {
        return NextResponse.json({ error: 'Already claimed' }, { status: 410 }); // Gone
      }
      
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }
    
    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        website: client.website,
        description: client.description,
      },
      hasOrders: false, // Can be enhanced later to check order_groups
      orderCount: 0,
    });
  } catch (error) {
    console.error('Error validating claim token:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}