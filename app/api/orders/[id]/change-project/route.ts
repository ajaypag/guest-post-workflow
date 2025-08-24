import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { projectId, clientId } = body;

    if (!projectId || !clientId) {
      return NextResponse.json({ error: 'Project ID and Client ID are required' }, { status: 400 });
    }

    // Verify the project exists and belongs to the client
    const project = await db.query.bulkAnalysisProjects.findFirst({
      where: and(
        eq(bulkAnalysisProjects.id, projectId),
        eq(bulkAnalysisProjects.clientId, clientId)
      )
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or does not belong to this client' }, { status: 404 });
    }

    // Get all line items for this client in this order
    const lineItems = await db.query.orderLineItems.findMany({
      where: and(
        eq(orderLineItems.orderId, orderId),
        eq(orderLineItems.clientId, clientId)
      )
    });

    // Update each line item's metadata to include the project ID
    for (const item of lineItems) {
      const currentMetadata = item.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        bulkAnalysisProjectId: projectId
      };

      await db
        .update(orderLineItems)
        .set({
          metadata: updatedMetadata
        })
        .where(eq(orderLineItems.id, item.id));
    }

    return NextResponse.json({ 
      success: true,
      message: 'Project updated successfully',
      projectId
    });

  } catch (error: any) {
    console.error('Error changing project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change project' },
      { status: 500 }
    );
  }
}