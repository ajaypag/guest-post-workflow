import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const data = await request.json();
    const { assignedTo } = data; // Internal user who will handle bulk analysis
    
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Get the order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));
        
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.status !== 'draft') {
        throw new Error('Order must be in draft status to confirm');
      }
      
      // Get all order groups with their clients
      const groups = await tx
        .select({
          orderGroup: orderGroups,
          client: clients
        })
        .from(orderGroups)
        .innerJoin(clients, eq(orderGroups.clientId, clients.id))
        .where(eq(orderGroups.orderId, orderId));
        
      if (groups.length === 0) {
        throw new Error('No order groups found');
      }
      
      // Create bulk analysis projects for each group
      const projectPromises = groups.map(async ({ orderGroup, client }) => {
        // Only create if no project exists yet
        if (!orderGroup.bulkAnalysisProjectId) {
          const projectId = uuidv4();
          const projectName = `Order #${orderId.slice(0, 8)} - ${client.name}`;
          const projectDescription = `Bulk analysis for ${orderGroup.linkCount} links ordered for ${client.name}`;
          
          // Create the project
          const [project] = await tx
            .insert(bulkAnalysisProjects)
            .values({
              id: projectId,
              clientId: orderGroup.clientId,
              name: projectName,
              description: projectDescription,
              icon: '📊',
              color: '#3B82F6',
              status: 'active',
              autoApplyKeywords: [], // Will be populated from target pages
              tags: ['order', `${orderGroup.linkCount} links`, `order-group:${orderGroup.id}`],
              createdBy: assignedTo || '00000000-0000-0000-0000-000000000000',
              createdAt: new Date(),
              updatedAt: new Date(),
              lastActivityAt: new Date()
            })
            .returning();
            
          // Update order group with project ID
          await tx
            .update(orderGroups)
            .set({ 
              bulkAnalysisProjectId: project.id,
              updatedAt: new Date()
            })
            .where(eq(orderGroups.id, orderGroup.id));
            
          return project;
        }
        
        return null;
      });
      
      const projects = await Promise.all(projectPromises);
      const createdProjects = projects.filter(p => p !== null);
      
      // Update order status to confirmed
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: 'confirmed',
          state: 'analyzing',
          assignedTo: assignedTo || null,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();
        
      return NextResponse.json({
        success: true,
        order: updatedOrder,
        projectsCreated: createdProjects.length,
        projects: createdProjects
      });
    });
    
  } catch (error: any) {
    console.error('Error confirming order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm order' },
      { status: 500 }
    );
  }
}