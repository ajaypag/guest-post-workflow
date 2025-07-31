import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
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

    // Update account status
    const [updated] = await db
      .update(accounts)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account: updated });
  } catch (error) {
    console.error('Error updating account status:', error);
    return NextResponse.json(
      { error: 'Failed to update account status' },
      { status: 500 }
    );
  }
}