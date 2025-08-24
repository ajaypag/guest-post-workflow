import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { 
  targetPages, 
  workflows, 
  clients,
  bulkAnalysisProjects
} from '@/lib/db/schema';
import { orders } from '@/lib/db/orderSchema';
import { eq, desc, and, or, sql, isNotNull } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: Date;
  user?: string;
  metadata?: any;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: clientId } = await params;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    
    const activities: ActivityItem[] = [];

    // 1. Get target pages activities
    const targetPagesData = await db
      .select({
        id: targetPages.id,
        url: targetPages.url,
        status: targetPages.status,
        addedAt: targetPages.addedAt,
        completedAt: targetPages.completedAt,
      })
      .from(targetPages)
      .where(eq(targetPages.clientId, clientId))
      .orderBy(desc(targetPages.addedAt))
      .limit(20);

    // Add page additions
    targetPagesData.forEach((page: any) => {
      activities.push({
        id: `page-added-${page.id}`,
        type: 'page_added',
        title: 'Target Page Added',
        description: `Added ${page.url} to tracking`,
        timestamp: page.addedAt,
        metadata: { url: page.url, status: page.status }
      });

      // Add completion events
      if (page.completedAt) {
        activities.push({
          id: `page-completed-${page.id}`,
          type: 'status_change',
          title: 'Page Marked Complete',
          description: `${page.url} marked as completed`,
          timestamp: page.completedAt,
          metadata: { url: page.url, toStatus: 'completed' }
        });
      }
    });

    // 2. Get workflows activities
    const workflowsData = await db
      .select({
        id: workflows.id,
        title: workflows.title,
        status: workflows.status,
        createdAt: workflows.createdAt,
        completedAt: workflows.completedAt,
        targetPages: workflows.targetPages,
      })
      .from(workflows)
      .where(eq(workflows.clientId, clientId))
      .orderBy(desc(workflows.createdAt))
      .limit(20);

    workflowsData.forEach((workflow: any) => {
      // Workflow creation
      activities.push({
        id: `workflow-created-${workflow.id}`,
        type: 'workflow_created',
        title: 'Workflow Created',
        description: `Created workflow: ${workflow.title}`,
        timestamp: workflow.createdAt,
        metadata: { title: workflow.title, status: workflow.status }
      });

      // Workflow completion
      if (workflow.completedAt) {
        activities.push({
          id: `workflow-completed-${workflow.id}`,
          type: 'workflow_completed',
          title: 'Workflow Completed',
          description: `Completed workflow: ${workflow.title}`,
          timestamp: workflow.completedAt,
          metadata: { title: workflow.title }
        });
      }
    });

    // 3. Get bulk analysis projects
    const bulkAnalysisData = await db
      .select({
        id: bulkAnalysisProjects.id,
        projectName: bulkAnalysisProjects.name,
        domainCount: bulkAnalysisProjects.domainCount,
        qualifiedCount: bulkAnalysisProjects.qualifiedCount,
        status: bulkAnalysisProjects.status,
        createdAt: bulkAnalysisProjects.createdAt,
        lastActivityAt: bulkAnalysisProjects.lastActivityAt,
      })
      .from(bulkAnalysisProjects)
      .where(eq(bulkAnalysisProjects.clientId, clientId))
      .orderBy(desc(bulkAnalysisProjects.createdAt))
      .limit(10);

    bulkAnalysisData.forEach((project: any) => {
      // Project creation
      activities.push({
        id: `bulk-analysis-${project.id}`,
        type: 'bulk_analysis',
        title: 'Bulk Analysis Started',
        description: `Analyzing ${project.domainCount || 0} domains for "${project.projectName}"`,
        timestamp: project.createdAt,
        metadata: { 
          projectName: project.projectName,
          domainCount: project.domainCount 
        }
      });

      // Project completion
      if (project.status === 'completed' && project.lastActivityAt) {
        activities.push({
          id: `bulk-analysis-completed-${project.id}`,
          type: 'bulk_analysis_completed',
          title: 'Bulk Analysis Completed',
          description: `Qualified ${project.qualifiedCount || 0} of ${project.domainCount || 0} domains`,
          timestamp: project.lastActivityAt,
          metadata: { 
            projectName: project.projectName,
            qualified: project.qualifiedCount,
            total: project.domainCount
          }
        });
      }
    });

    // 4. Get orders (if they exist)
    try {
      const ordersData = await db
        .select({
          id: orders.id,
          orderNumber: sql<string>`${orders.id}`,
          status: orders.status,
          totalAmount: orders.totalRetail,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.accountId, clientId))
        .orderBy(desc(orders.createdAt))
        .limit(10);

      ordersData.forEach((order: any) => {
        // Order creation
        activities.push({
          id: `order-created-${order.id}`,
          type: 'order_created',
          title: 'Order Created',
          description: `Order ${order.orderNumber} (${order.status})`,
          timestamp: order.createdAt,
          metadata: { 
            orderNumber: order.orderNumber,
            amount: order.totalAmount,
            status: order.status
          }
        });
      });
    } catch (e) {
      // Orders table might not exist in all environments
      console.log('Orders table not available');
    }

    // 5. Get client updates
    const clientData = await db
      .select({
        id: clients.id,
        name: clients.name,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        convertedFromProspectAt: clients.convertedFromProspectAt,
        archivedAt: clients.archivedAt,
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (clientData.length > 0) {
      const client = clientData[0];
      
      // Client creation
      activities.push({
        id: `client-created-${client.id}`,
        type: 'client_created',
        title: 'Client Created',
        description: `${client.name} added to system`,
        timestamp: client.createdAt,
        metadata: { clientName: client.name }
      });

      // Prospect conversion
      if (client.convertedFromProspectAt) {
        activities.push({
          id: `client-converted-${client.id}`,
          type: 'client_converted',
          title: 'Converted to Client',
          description: `${client.name} converted from prospect to client`,
          timestamp: client.convertedFromProspectAt,
          metadata: { clientName: client.name }
        });
      }

      // Archive event
      if (client.archivedAt) {
        activities.push({
          id: `client-archived-${client.id}`,
          type: 'client_archived',
          title: 'Client Archived',
          description: `${client.name} was archived`,
          timestamp: client.archivedAt,
          metadata: { clientName: client.name }
        });
      }
    }

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      activities: limitedActivities,
      total: activities.length,
      hasMore: activities.length > limit
    });

  } catch (error) {
    console.error('Error fetching client activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}