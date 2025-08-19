import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { clients, targetPages } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
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
      
      // Use lineItems directly for bulk analysis
      const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
      const { projectOrderAssociations } = await import('@/lib/db/projectOrderAssociationsSchema');
      
      const lineItems = await tx
        .select({
          lineItem: orderLineItems,
          client: clients
        })
        .from(orderLineItems)
        .innerJoin(clients, eq(orderLineItems.clientId, clients.id))
        .where(eq(orderLineItems.orderId, orderId));
      
      if (lineItems.length === 0) {
        throw new Error('No line items found in order');
      }
      
      // Group lineItems by client for project creation
      const lineItemsByClient = new Map<string, typeof lineItems>();
      lineItems.forEach(item => {
        const clientId = item.client.id;
        if (!lineItemsByClient.has(clientId)) {
          lineItemsByClient.set(clientId, []);
        }
        lineItemsByClient.get(clientId)!.push(item);
      });
      
      // Create bulk analysis projects for each client
      const projectPromises = Array.from(lineItemsByClient.entries()).map(async ([clientId, clientItems]) => {
        const client = clientItems[0].client;
        const linkCount = clientItems.length;
        
        // Extract target page IDs from line items first
        const targetPageIds = clientItems
          .map(item => item.lineItem.targetPageId)
          .filter((id): id is string => id !== null);
        
        // Check if project already exists for this order and client
        // Since projectOrderAssociations requires orderGroupId, we'll check differently
        const existingProjects = await tx
          .select()
          .from(bulkAnalysisProjects)
          .where(and(
            eq(bulkAnalysisProjects.clientId, clientId),
            sql`tags @> ${JSON.stringify([`order:${orderId}`])}`
          ))
          .limit(1);
        
        if (existingProjects.length > 0) {
          console.log(`Project already exists for client ${client.name}`);
          return { project: existingProjects[0], targetPageIds };
        }
        
        const projectId = uuidv4();
        const projectName = `Order #${orderId.slice(0, 8)} - ${client.name}`;
        const projectDescription = `Bulk analysis for ${linkCount} links ordered for ${client.name}`;
          
          // Get target page keywords for auto-apply
          let autoApplyKeywords: string[] = [];
          if (targetPageIds.length > 0) {
            const pages = await tx
              .select()
              .from(targetPages)
              .where(eq(targetPages.clientId, clientId));
              
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
              clientId: clientId,
              name: projectName,
              description: projectDescription,
              icon: '📊',
              color: '#3B82F6',
              status: 'active',
              autoApplyKeywords,
              tags: ['order', `${linkCount} links`, `order:${orderId}`, ...targetPageIds.map((id: string) => `target-page:${id}`)],
              createdBy: assignedTo || '00000000-0000-0000-0000-000000000000',
              createdAt: new Date(),
              updatedAt: new Date(),
              lastActivityAt: new Date()
            })
            .returning();
            
          // Note: We can't use projectOrderAssociations as it requires orderGroupId
          // The association is tracked via tags in the project and metadata in line items
          
          // Update line items with project ID in metadata
          const currentMetadata = await tx
            .select({ metadata: orderLineItems.metadata })
            .from(orderLineItems)
            .where(and(
              eq(orderLineItems.orderId, orderId),
              eq(orderLineItems.clientId, clientId)
            ));
          
          const updatedMetadata = {
            ...(currentMetadata[0]?.metadata || {}),
            bulkAnalysisProjectId: project.id
          };
          
          await tx
            .update(orderLineItems)
            .set({
              metadata: updatedMetadata,
              modifiedAt: new Date()
            })
            .where(and(
              eq(orderLineItems.orderId, orderId),
              eq(orderLineItems.clientId, clientId)
            ));
            
          return { project, targetPageIds };
        
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
      
      // Create benchmark snapshot of the confirmed order (uses line items directly)
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