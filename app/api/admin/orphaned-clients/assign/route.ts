import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { inArray, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { clientIds, accountId } = await request.json();

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'No clients selected' },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: 'No account selected' },
        { status: 400 }
      );
    }

    // Update all selected clients to have the specified accountId
    const result = await db
      .update(clients)
      .set({ 
        accountId: sql`${accountId}::uuid`,
        updatedAt: new Date() 
      })
      .where(inArray(clients.id, clientIds));

    return NextResponse.json({ 
      success: true,
      assigned: clientIds.length,
      message: `Successfully assigned ${clientIds.length} clients to account`
    });

  } catch (error) {
    console.error('Error assigning clients:', error);
    return NextResponse.json(
      { error: 'Failed to assign clients to account' },
      { status: 500 }
    );
  }
}