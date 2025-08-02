import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { projectOrderAssociations } from '@/lib/db/projectOrderAssociationsSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const params = await context.params;
  try {
    // Get user session
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { orderId, orderGroupId, associationType = 'primary' } = await request.json();
    
    if (!orderId || !orderGroupId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if project exists and get its client
    const project = await db.query.bulkAnalysisProjects.findFirst({
      where: eq(bulkAnalysisProjects.id, params.projectId)
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Get the order group to verify client match
    const orderGroup = await db.query.orderGroups.findFirst({
      where: eq(orderGroups.id, orderGroupId),
      with: {
        order: true
      }
    });
    
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }
    
    // CRITICAL: Verify client match to prevent cross-client data issues
    if (project.clientId !== orderGroup.clientId) {
      return NextResponse.json({ 
        error: 'Client mismatch: Project and order belong to different clients',
        projectClientId: project.clientId,
        orderClientId: orderGroup.clientId
      }, { status: 400 });
    }
    
    // Check if association already exists
    const existingAssociation = await db.query.projectOrderAssociations.findFirst({
      where: and(
        eq(projectOrderAssociations.projectId, params.projectId),
        eq(projectOrderAssociations.orderId, orderId),
        eq(projectOrderAssociations.orderGroupId, orderGroupId)
      )
    });
    
    if (existingAssociation) {
      return NextResponse.json({ 
        message: 'Association already exists',
        association: existingAssociation 
      });
    }
    
    // Create new association
    const [newAssociation] = await db.insert(projectOrderAssociations).values({
      projectId: params.projectId,
      orderId,
      orderGroupId,
      associationType,
      createdBy: session.userId,
      notes: {
        reason: 'Associated via bulk analysis project page'
      }
    }).returning();
    
    return NextResponse.json({ 
      message: 'Project associated with order successfully',
      association: newAssociation 
    });
    
  } catch (error) {
    console.error('Error associating project with order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}