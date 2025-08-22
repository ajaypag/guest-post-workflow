import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthService } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = AuthService.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only internal users can reassign workflows
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Forbidden - Only internal users can reassign workflows' }, { status: 403 });
    }

    const { assignedUserId } = await request.json();
    
    if (!assignedUserId) {
      return NextResponse.json({ error: 'assignedUserId is required' }, { status: 400 });
    }

    // Update the workflow's assigned user
    const result = await db
      .update(workflows)
      .set({
        assignedUserId,
        updatedAt: new Date()
      })
      .where(eq(workflows.id, params.id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      workflow: result[0] 
    });
  } catch (error) {
    console.error('Error reassigning workflow:', error);
    return NextResponse.json(
      { error: 'Failed to reassign workflow' },
      { status: 500 }
    );
  }
}