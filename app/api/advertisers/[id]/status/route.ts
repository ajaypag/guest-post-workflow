import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { advertisers } from '@/lib/db/advertiserSchema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { status } = await request.json();

    if (!['active', 'pending', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update advertiser status
    const [updated] = await db
      .update(advertisers)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(advertisers.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 });
    }

    return NextResponse.json({ advertiser: updated });
  } catch (error) {
    console.error('Error updating advertiser status:', error);
    return NextResponse.json(
      { error: 'Failed to update advertiser status' },
      { status: 500 }
    );
  }
}