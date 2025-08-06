import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { projectOrderAssociations } from '@/lib/db/projectOrderAssociationsSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

// GET - List all bulk analysis projects for an order group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can manage bulk analysis projects' }, { status: 403 });
    }

    const { id: orderId, groupId } = await params;

    // Get the order group with its primary project
    const [orderGroup] = await db.select().from(orderGroups).where(eq(orderGroups.id, groupId));
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    // Get all associated projects from projectOrderAssociations
    const associations = await db
      .select({
        association: projectOrderAssociations,
        project: bulkAnalysisProjects
      })
      .from(projectOrderAssociations)
      .innerJoin(bulkAnalysisProjects, eq(projectOrderAssociations.projectId, bulkAnalysisProjects.id))
      .where(and(
        eq(projectOrderAssociations.orderGroupId, groupId),
        eq(projectOrderAssociations.orderId, orderId)
      ));

    // Include the primary project if it's not in associations
    let allProjects = associations.map(a => ({
      ...a.project,
      associationType: a.association.associationType,
      associationId: a.association.id,
      isPrimary: a.project.id === orderGroup.bulkAnalysisProjectId
    }));

    // If there's a primary project not in associations, fetch it
    if (orderGroup.bulkAnalysisProjectId && !allProjects.find(p => p.id === orderGroup.bulkAnalysisProjectId)) {
      const [primaryProject] = await db.select().from(bulkAnalysisProjects)
        .where(eq(bulkAnalysisProjects.id, orderGroup.bulkAnalysisProjectId));
      
      if (primaryProject) {
        allProjects.unshift({
          ...primaryProject,
          associationType: 'primary',
          associationId: null,
          isPrimary: true
        });
      }
    }

    return NextResponse.json({
      success: true,
      projects: allProjects,
      primaryProjectId: orderGroup.bulkAnalysisProjectId
    });

  } catch (error: any) {
    console.error('Error fetching bulk analysis projects:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bulk analysis projects' },
      { status: 500 }
    );
  }
}

// POST - Associate a new bulk analysis project with an order group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can manage bulk analysis projects' }, { status: 403 });
    }

    const { id: orderId, groupId } = await params;
    const { projectId, associationType = 'reference', notes, makePrimary } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify the order group exists
    const [orderGroup] = await db.select().from(orderGroups).where(eq(orderGroups.id, groupId));
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    // Verify the project exists
    const [project] = await db.select().from(bulkAnalysisProjects)
      .where(eq(bulkAnalysisProjects.id, projectId));
    if (!project) {
      return NextResponse.json({ error: 'Bulk analysis project not found' }, { status: 404 });
    }

    // Check if association already exists
    const [existingAssociation] = await db.select().from(projectOrderAssociations)
      .where(and(
        eq(projectOrderAssociations.orderGroupId, groupId),
        eq(projectOrderAssociations.projectId, projectId)
      ));

    if (existingAssociation) {
      return NextResponse.json({ error: 'This project is already associated with this order group' }, { status: 400 });
    }

    // Create the association
    const [newAssociation] = await db.insert(projectOrderAssociations).values({
      orderId,
      orderGroupId: groupId,
      projectId,
      associationType: makePrimary ? 'primary' : associationType,
      createdBy: session.userId,
      notes: notes ? { reason: notes } : undefined
    }).returning();

    // If makePrimary is true, update the orderGroup's bulkAnalysisProjectId
    if (makePrimary) {
      await db.update(orderGroups)
        .set({ 
          bulkAnalysisProjectId: projectId,
          updatedAt: new Date()
        })
        .where(eq(orderGroups.id, groupId));
    }

    return NextResponse.json({
      success: true,
      association: newAssociation,
      message: `Project successfully ${makePrimary ? 'set as primary and' : ''} associated with order group`
    });

  } catch (error: any) {
    console.error('Error associating bulk analysis project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to associate bulk analysis project' },
      { status: 500 }
    );
  }
}

// PUT - Update association (e.g., change primary project)
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
      return NextResponse.json({ error: 'Only internal users can manage bulk analysis projects' }, { status: 403 });
    }

    const { groupId } = await params;
    const { projectId, makePrimary } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify the project exists and is associated
    const [association] = await db.select().from(projectOrderAssociations)
      .where(and(
        eq(projectOrderAssociations.orderGroupId, groupId),
        eq(projectOrderAssociations.projectId, projectId)
      ));

    if (!association && makePrimary) {
      // If not associated but we want to make it primary, check if it's the current primary
      const [orderGroup] = await db.select().from(orderGroups).where(eq(orderGroups.id, groupId));
      if (orderGroup?.bulkAnalysisProjectId !== projectId) {
        return NextResponse.json({ error: 'Project is not associated with this order group' }, { status: 404 });
      }
    }

    if (makePrimary) {
      // Update all associations for this group to non-primary
      await db.update(projectOrderAssociations)
        .set({ associationType: 'reference' })
        .where(eq(projectOrderAssociations.orderGroupId, groupId));

      // Update the specific one to primary
      if (association) {
        await db.update(projectOrderAssociations)
          .set({ associationType: 'primary' })
          .where(eq(projectOrderAssociations.id, association.id));
      }

      // Update the orderGroup's bulkAnalysisProjectId
      await db.update(orderGroups)
        .set({ 
          bulkAnalysisProjectId: projectId,
          updatedAt: new Date()
        })
        .where(eq(orderGroups.id, groupId));
    }

    return NextResponse.json({
      success: true,
      message: makePrimary ? 'Primary project updated' : 'Association updated'
    });

  } catch (error: any) {
    console.error('Error updating bulk analysis project association:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update association' },
      { status: 500 }
    );
  }
}