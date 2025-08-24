import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthService } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { id } = await params;
    
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

    // Calculate estimated completion date (14 days from now - 2 weeks)
    const now = new Date();
    const estimatedCompletionDate = new Date(now);
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 14);
    
    // Update the workflow's assigned user and estimated completion
    const result = await db
      .update(workflows)
      .set({
        assignedUserId,
        assignedAt: now,
        estimatedCompletionDate,
        updatedAt: now
      })
      .where(eq(workflows.id, id))
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