import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { clients, targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthServiceServer } from '@/lib/auth-server';
import { generateKeywords, formatKeywordsForStorage } from '@/lib/services/keywordGenerationService';
import { generateDescription } from '@/lib/services/descriptionGenerationService';
import { ClientService } from '@/lib/db/clientService';
import { createOrderBenchmark } from '@/lib/orders/benchmarkUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - only internal users can confirm orders
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Access denied. Order confirmation requires internal user privileges.' }, { status: 403 });
    }

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
      
      if (order.status !== 'pending_confirmation') {
        throw new Error('Order must be in pending_confirmation status to confirm');
      }
      
      // MIGRATION: Skip orderGroups logic during lineItems migration
      // Get all order groups with their clients
      const groups = await tx
        .select({
          orderGroup: orderGroups,
          client: clients
        })
        .from(orderGroups)
        .innerJoin(clients, eq(orderGroups.clientId, clients.id))
        .where(eq(orderGroups.orderId, orderId));
        
      // During migration, allow orders without groups
      // if (groups.length === 0) {
      //   throw new Error('No order groups found');
      // }
      
      // Create bulk analysis projects for each group
      const projectPromises = groups.map(async ({ orderGroup, client }) => {
        // Only create if no project exists yet
        if (!orderGroup.bulkAnalysisProjectId) {
          const projectId = uuidv4();
          const projectName = `Order #${orderId.slice(0, 8)} - ${client.name}`;
          const projectDescription = `Bulk analysis for ${orderGroup.linkCount} links ordered for ${client.name}`;
          
          // Extract target page IDs from order group
          const targetPageIds = orderGroup.targetPages
            ?.filter((tp: any) => tp.pageId)
            .map((tp: any) => tp.pageId) || [];
          
          // Get target page keywords for auto-apply
          let autoApplyKeywords: string[] = [];
          if (targetPageIds.length > 0) {
            const pages = await tx
              .select()
              .from(targetPages)
              .where(eq(targetPages.clientId, orderGroup.clientId));
              
            const relevantPages = pages.filter(p => targetPageIds.includes(p.id));
            
            // Generate keywords for pages that don't have them
            for (const page of relevantPages) {
              if (!page.keywords || page.keywords.trim() === '') {
                try {
                  console.log(`🤖 Generating keywords for target page: ${page.url}`);
                  const keywordResult = await generateKeywords(page.url);
                  
                  if (keywordResult.success && keywordResult.keywords.length > 0) {
                    const keywordsString = formatKeywordsForStorage(keywordResult.keywords);
                    
                    // Update the target page with generated keywords
                    await tx
                      .update(targetPages)
                      .set({ 
                        keywords: keywordsString
                      })
                      .where(eq(targetPages.id, page.id));
                    
                    // Update the page object for immediate use
                    page.keywords = keywordsString;
                    console.log(`✅ Generated ${keywordResult.keywords.length} keywords for ${page.url}`);
                  }
                } catch (error) {
                  console.error(`Failed to generate keywords for ${page.url}:`, error);
                  // Continue with other pages even if one fails
                }
              }
              
              // Generate description if missing
              if (!page.description || page.description.trim() === '') {
                try {
                  console.log(`🤖 Generating description for target page: ${page.url}`);
                  const descResult = await generateDescription(page.url);
                  
                  if (descResult.success && descResult.description) {
                    // Update the target page with generated description
                    await tx
                      .update(targetPages)
                      .set({ 
                        description: descResult.description
                      })
                      .where(eq(targetPages.id, page.id));
                    
                    console.log(`✅ Generated description for ${page.url}`);
                  }
                } catch (error) {
                  console.error(`Failed to generate description for ${page.url}:`, error);
                  // Continue with other pages even if one fails
                }
              }
            }
            
            // Now collect all keywords (including newly generated ones)
            const allKeywords = relevantPages
              .map(p => p.keywords || '')
              .filter(k => k.trim() !== '')
              .join(', ')
              .split(',')
              .map(k => k.trim())
              .filter(k => k !== '');
            
            // Remove duplicates
            autoApplyKeywords = [...new Set(allKeywords)];
          }
          
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
              autoApplyKeywords,
              tags: ['order', `${orderGroup.linkCount} links`, `order-group:${orderGroup.id}`, ...targetPageIds.map((id: string) => `target-page:${id}`)],
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
            
          return { project, targetPageIds };
        }
        
        return null;
      });
      
      const projectResults = await Promise.all(projectPromises);
      const createdProjects = projectResults
        .filter(p => p !== null)
        .map(p => p!.project);
      const projectTargetPages = projectResults
        .filter(p => p !== null)
        .map(p => ({ projectId: p!.project.id, targetPageIds: p!.targetPageIds }));
      
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
      
      // Create benchmark snapshot of the confirmed order
      let benchmark;
      try {
        benchmark = await createOrderBenchmark(orderId, session.userId, 'order_confirmed');
        console.log(`✅ Created benchmark for order ${orderId}`);
      } catch (benchmarkError) {
        console.error('Failed to create benchmark:', benchmarkError);
        // Don't fail the confirmation if benchmark creation fails
      }
        
      return NextResponse.json({
        success: true,
        order: updatedOrder,
        projectsCreated: createdProjects.length,
        projects: createdProjects,
        projectTargetPages, // Include this for frontend to use when creating domains
        benchmarkCreated: !!benchmark
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