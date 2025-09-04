import { NextRequest, NextResponse } from 'next/server';
import { requireInternalUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/connection';
import { eq } from 'drizzle-orm';
import { suggestedTags } from '@/lib/db/nichesSchema';

// Update a suggested tag
export async function PATCH(request: NextRequest) {
  // Check authentication - internal users only
  const authCheck = await requireInternalUser(request);
  if (authCheck instanceof NextResponse) {
    return authCheck;
  }

  const { id, tagName } = await request.json();

  if (!id || !tagName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await db
      .update(suggestedTags)
      .set({
        tagName: tagName,
        updatedAt: new Date()
      })
      .where(eq(suggestedTags.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating suggested tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// Delete a suggested tag
export async function DELETE(request: NextRequest) {
  // Check authentication - internal users only
  const authCheck = await requireInternalUser(request);
  if (authCheck instanceof NextResponse) {
    return authCheck;
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing tag ID' }, { status: 400 });
  }

  try {
    await db
      .delete(suggestedTags)
      .where(eq(suggestedTags.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting suggested tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}