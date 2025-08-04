import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { canUseAiKeywords, canUseAiDescriptions, canUseAiContentGeneration } = body;

    // Update account permissions
    const [updatedAccount] = await db
      .update(accounts)
      .set({
        canUseAiKeywords: canUseAiKeywords ?? false,
        canUseAiDescriptions: canUseAiDescriptions ?? false,
        canUseAiContentGeneration: canUseAiContentGeneration ?? false,
        aiPermissions: JSON.stringify({
          canUseAiKeywords: canUseAiKeywords ?? false,
          canUseAiDescriptions: canUseAiDescriptions ?? false,
          canUseAiContentGeneration: canUseAiContentGeneration ?? false,
          updatedAt: new Date().toISOString(),
          updatedBy: session.userId
        }),
        updatedAt: new Date()
      })
      .where(eq(accounts.id, params.id))
      .returning();

    if (!updatedAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      account: updatedAccount
    });

  } catch (error) {
    console.error('Error updating AI permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update AI permissions' },
      { status: 500 }
    );
  }
}