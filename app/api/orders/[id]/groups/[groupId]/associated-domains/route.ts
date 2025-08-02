import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { projectOrderAssociations } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  const params = await context.params;
  try {
    // Get user session
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the order group to verify access
    const orderGroup = await db.query.orderGroups.findFirst({
      where: eq(orderGroups.id, params.groupId),
      with: {
        order: true,
      }
    });
    
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }
    
    // Check permissions
    if (session.userType === 'account') {
      // Account users can only access their own orders
      if (orderGroup.order.accountId !== session.accountId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get all domains associated with this order group via project associations
    const associations = await db.query.projectOrderAssociations.findMany({
      where: and(
        eq(projectOrderAssociations.orderGroupId, params.groupId),
        eq(projectOrderAssociations.orderId, params.id)
      ),
    });
    
    if (!associations.length) {
      return NextResponse.json({ domains: [] });
    }
    
    // Get the project ID from associations (should be consistent for the group)
    const projectId = associations[0].projectId;
    
    // Verify project belongs to the same client as the order
    const project = await db.query.bulkAnalysisProjects.findFirst({
      where: eq(bulkAnalysisProjects.id, projectId)
    });
    
    if (!project || project.clientId !== orderGroup.clientId) {
      console.error('Security violation: Project client mismatch', {
        projectClientId: project?.clientId,
        orderClientId: orderGroup.clientId
      });
      return NextResponse.json({ error: 'Security error: Invalid project association' }, { status: 403 });
    }
    
    // Get all domains for this project
    const domains = await db.query.bulkAnalysisDomains.findMany({
      where: eq(bulkAnalysisDomains.projectId, projectId),
    });
    
    return NextResponse.json({ 
      domains,
      projectId,
      orderGroup
    });
    
  } catch (error) {
    console.error('Error fetching associated domains:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}