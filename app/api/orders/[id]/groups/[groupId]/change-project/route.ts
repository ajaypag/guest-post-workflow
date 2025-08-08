import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

// PUT - Change the bulk analysis project for an order group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can change bulk analysis projects' }, { status: 403 });
    }

    const { groupId } = await params;
    const { projectId } = await request.json();

    // Verify the order group exists
    const [orderGroup] = await db.select().from(orderGroups).where(eq(orderGroups.id, groupId));
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    // If projectId is provided, verify the project exists
    if (projectId) {
      const [project] = await db.select().from(bulkAnalysisProjects)
        .where(eq(bulkAnalysisProjects.id, projectId));
      if (!project) {
        return NextResponse.json({ error: 'Bulk analysis project not found' }, { status: 404 });
      }

      // Verify the project belongs to the same client
      if (project.clientId !== orderGroup.clientId) {
        return NextResponse.json({ 
          error: 'Project must belong to the same client as the order group' 
        }, { status: 400 });
      }
    }

    // Update the order group's bulk analysis project
    const [updatedGroup] = await db.update(orderGroups)
      .set({ 
        bulkAnalysisProjectId: projectId || null, // Allow removing the project
        updatedAt: new Date()
      })
      .where(eq(orderGroups.id, groupId))
      .returning();

    return NextResponse.json({
      success: true,
      orderGroup: updatedGroup,
      message: projectId 
        ? 'Bulk analysis project changed successfully' 
        : 'Bulk analysis project removed from order group'
    });

  } catch (error: any) {
    console.error('Error changing bulk analysis project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change bulk analysis project' },
      { status: 500 }
    );
  }
}