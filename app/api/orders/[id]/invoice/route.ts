import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { accounts } from '@/lib/db/accountSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { isLineItemsSystemEnabled } from '@/lib/config/featureFlags';
import { PRICING_CONFIG } from '@/lib/config/pricing';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { action } = body; // 'generate_invoice' or 'mark_paid'

    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account') {
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Account users can only view invoices, not mark as paid
      if (action === 'mark_paid') {
        return NextResponse.json({ error: 'Only internal users can mark orders as paid' }, { status: 403 });
      }
    }

    if (action === 'generate_invoice' || action === 'regenerate_invoice') {
      console.log(`[INVOICE API] Starting invoice generation for order ${orderId}`);
      console.log(`[INVOICE API] Order state: ${order.state}, Account: ${order.accountId}`);
      
      // Check if regenerating
      const isRegenerate = action === 'regenerate_invoice';
      
      // If regenerating, check if invoice exists
      if (isRegenerate && !order.invoicedAt) {
        console.log('[INVOICE API] Regenerate requested but no invoice exists');
        return NextResponse.json({ 
          error: 'Cannot regenerate - no invoice exists yet' 
        }, { status: 400 });
      }
      
      // Check if using line items system
      let useLineItems = true; // FORCED: Migration to lineItems in progress
      let lineItemsList: any[] = [];
      
      // Always use line items system - EXCLUDE cancelled/refunded items from invoices
      lineItemsList = await db.query.orderLineItems.findMany({
        where: and(
          eq(orderLineItems.orderId, orderId),
          sql`${orderLineItems.status} NOT IN ('cancelled', 'refunded')`,
          sql`${orderLineItems.cancelledAt} IS NULL`
        ),
        with: {
          client: true
        }
      });
      
      // If no line items exist, we'll need to handle the migration
      if (lineItemsList.length === 0) {
        console.warn(`[MIGRATION] Order ${orderId} has no line items yet`);
      }
      
      // Variables for invoice generation
      let approvedItems: any[] = [];
      let pendingCount = 0;
      
      if (useLineItems) {
        // Use line items system
        console.log('[INVOICE] Using line items system for invoice generation');
        
        // Check for unassigned or pending line items
        const unassignedItems = lineItemsList.filter(item => !item.assignedDomainId);
        const pendingItems = lineItemsList.filter(item => 
          item.status === 'pending' || item.status === 'draft'
        );
        const unusedItems = [...new Set([...unassignedItems, ...pendingItems])]; // Remove duplicates
        
        // If there are unused items, check if user wants to auto-cancel them
        if (unusedItems.length > 0) {
          const { cancelUnusedItems } = body;
          
          if (!cancelUnusedItems) {
            // Return warning with unused items details for user decision
            return NextResponse.json({ 
              warning: 'unused_line_items',
              message: 'This order has unused line items that need to be cancelled before generating invoice',
              unusedItems: unusedItems.map(item => ({
                id: item.id,
                status: item.status,
                hasAssignedDomain: !!item.assignedDomainId,
                targetPageUrl: item.targetPageUrl,
                clientName: item.client?.name
              })),
              totalRequested: lineItemsList.length,
              totalAssigned: lineItemsList.length - unusedItems.length,
              unusedCount: unusedItems.length
            }, { status: 422 }); // 422 = Unprocessable Entity (needs user decision)
          }
          
          // User chose to cancel unused items - soft delete them
          console.log(`[INVOICE] Auto-cancelling ${unusedItems.length} unused line items`);
          const batchId = crypto.randomUUID();
          
          for (const item of unusedItems) {
            await db.update(orderLineItems)
              .set({
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledBy: session.userId,
                cancellationReason: `Auto-cancelled during invoice generation: ${!item.assignedDomainId ? 'No site assigned' : 'Pending review'}`,
                metadata: {
                  ...(item.metadata as any || {}),
                  autoCancelledForInvoice: true,
                  originalStatus: item.status
                },
                modifiedAt: new Date(),
                modifiedBy: session.userId
              })
              .where(eq(orderLineItems.id, item.id));
          }
          
          // Refresh line items list after cancellation
          lineItemsList = await db.query.orderLineItems.findMany({
            where: and(
              eq(orderLineItems.orderId, orderId),
              sql`${orderLineItems.status} NOT IN ('cancelled', 'refunded')`,
              sql`${orderLineItems.cancelledAt} IS NULL`
            ),
            with: {
              client: true
            }
          });
          
          console.log(`[INVOICE] After cancellation: ${lineItemsList.length} active line items remaining`);
        }
        
        // Get approved/assigned line items (including already invoiced items for regeneration)
        // EXCLUDE any items that are explicitly excluded by the client
        console.log(`[INVOICE] Found ${lineItemsList.length} total line items for invoice generation`);
        lineItemsList.forEach(item => {
          console.log(`[INVOICE] Item ${item.id.slice(0,8)}: status=${item.status}, inclusionStatus=${item.metadata?.inclusionStatus}, assignedDomainId=${!!item.assignedDomainId}`);
        });
        
        approvedItems = lineItemsList.filter(item => {
          // First check if item is explicitly excluded
          if (item.metadata?.inclusionStatus === 'excluded') {
            console.log(`[INVOICE] Excluding item ${item.id.slice(0,8)} - marked as excluded`);
            return false;
          }
          
          // Then check if item qualifies for invoice
          const qualifies = (
            item.status === 'approved' || 
            item.status === 'assigned' || 
            item.status === 'confirmed' ||
            item.status === 'invoiced' || // Allow invoiced items for regeneration
            (item.assignedDomainId && item.metadata?.inclusionStatus === 'included') // Also check metadata
          );
          
          if (qualifies) {
            console.log(`[INVOICE] Including item ${item.id.slice(0,8)} - status: ${item.status}, inclusion: ${item.metadata?.inclusionStatus}`);
          }
          
          return qualifies;
        });
        
        console.log(`[INVOICE] After filtering: ${approvedItems.length} approved items for invoice`);
        
        if (approvedItems.length === 0) {
          return NextResponse.json({ 
            error: 'Cannot generate invoice - no approved line items' 
          }, { status: 400 });
        }
      } else {
        // Fallback to old system
        console.log('[INVOICE] Using orderSiteSubmissions system for invoice generation');
        
        const orderGroupsList = await db.query.orderGroups.findMany({
          where: eq(orderGroups.orderId, orderId)
        });

        const allSubmissions = [];
        for (const group of orderGroupsList) {
          const submissions = await db.query.orderSiteSubmissions.findMany({
            where: eq(orderSiteSubmissions.orderGroupId, group.id)
          });
          allSubmissions.push(...submissions);
        }

        // Check if all sites have been reviewed
        // Sites are considered reviewed if:
        // 1. They have an inclusionStatus (new system)
        // 2. They have a selectionPool (legacy system - primary/alternative)
        // 3. They have been client_approved/client_rejected (old system)
        const pendingSubmissions = allSubmissions.filter(s => {
          // Has explicit inclusion status - reviewed
          if (s.inclusionStatus) return false;
          // Has selection pool - reviewed (primary = included, alternative = saved)
          if (s.selectionPool) return false;
          // Has been approved/rejected - reviewed
          if (s.submissionStatus === 'client_approved' || s.submissionStatus === 'client_rejected') return false;
          // Otherwise check if it's pending
          return s.submissionStatus === 'pending' || s.submissionStatus === 'submitted';
        });
        pendingCount = pendingSubmissions.length;
        
        if (pendingCount > 0) {
          return NextResponse.json({ 
            error: 'Cannot generate invoice - site review not complete',
            pendingCount 
          }, { status: 400 });
        }

        // Check for approved items using all status systems - EXCLUDE explicitly excluded items
        approvedItems = allSubmissions.filter(s => {
          // First check if explicitly excluded
          if (s.inclusionStatus === 'excluded') return false;
          
          // Then check approval status
          // New system: explicit inclusion
          if (s.inclusionStatus === 'included') return true;
          // Legacy system: primary pool = included
          if (s.selectionPool === 'primary') return true;
          // Old system: client approved
          if (s.submissionStatus === 'client_approved') return true;
          return false;
        });

        if (approvedItems.length === 0) {
          console.log('[INVOICE] No approved items found. Submission details:');
          allSubmissions.forEach(s => {
            console.log(`- ID: ${s.id.substring(0,8)}, inclusionStatus: ${s.inclusionStatus}, selectionPool: ${s.selectionPool}, submissionStatus: ${s.submissionStatus}`);
          });
          return NextResponse.json({ 
            error: 'Cannot generate invoice - no approved sites',
            debug: {
              totalSubmissions: allSubmissions.length,
              submissions: allSubmissions.map(s => ({
                inclusionStatus: s.inclusionStatus,
                selectionPool: s.selectionPool,
                submissionStatus: s.submissionStatus
              }))
            }
          }, { status: 400 });
        }
      }

      // Generate invoice number (simple format: INV-YYYYMMDD-XXXX)
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
      const invoiceNumber = `INV-${dateStr}-${randomStr}`;

      // Calculate invoice details from price snapshots
      let sitesSubtotal = 0;
      let serviceFeeTotal = 0;
      let wholesaleTotal = 0;
      
      // Get account info for billing
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, order.accountId!)
      });

      // Build invoice items - list each site individually with actual pricing
      const items = [];
      
      if (useLineItems) {
        // Generate invoice from line items
        for (const lineItem of approvedItems) {
          // Use approved price if set, otherwise estimated price
          const retailPrice = lineItem.approvedPrice || lineItem.estimatedPrice || PRICING_CONFIG.defaults.retailPricePerLink;
          const wholesalePrice = lineItem.wholesalePrice || PRICING_CONFIG.calculateWholesalePrice(retailPrice);
          const serviceFee = PRICING_CONFIG.serviceFee.standard;
          
          sitesSubtotal += retailPrice;
          wholesaleTotal += wholesalePrice;
          serviceFeeTotal += serviceFee;
          
          // Build description from line item data
          const clientName = lineItem.client?.name || 'Client';
          const domain = lineItem.assignedDomain || 'Pending Assignment';
          const targetPage = lineItem.targetPageUrl ? 
            ` for ${new URL(lineItem.targetPageUrl).pathname}` : '';
          
          items.push({
            description: `Guest Post - ${domain}${targetPage} (${clientName})`,
            quantity: 1,
            unitPrice: retailPrice,
            total: retailPrice,
            // Store line item ID for tracking
            lineItemId: lineItem.id
          });
        }
      } else {
        // Fallback to old system
        for (const submission of approvedItems) {
          // Get domain info
          const domain = await db.query.bulkAnalysisDomains.findFirst({
            where: eq(bulkAnalysisDomains.id, submission.domainId)
          });
          
          // Use price snapshot if available, fallback to default pricing
          const retailPrice = submission.retailPriceSnapshot || PRICING_CONFIG.defaults.retailPricePerLink;
          const wholesalePrice = submission.wholesalePriceSnapshot || PRICING_CONFIG.calculateWholesalePrice(retailPrice);
          const serviceFee = submission.serviceFeeSnapshot || PRICING_CONFIG.serviceFee.standard;
          
          sitesSubtotal += retailPrice;
          wholesaleTotal += wholesalePrice;
          serviceFeeTotal += serviceFee;
          
          items.push({
            description: `Guest Post - ${domain?.domain || 'Site'}`,
            quantity: 1,
            unitPrice: retailPrice,
            total: retailPrice
          });
        }
      }
      
      // Get optional services from order
      const clientReviewFee = order.clientReviewFee || 0;
      const rushFee = order.rushFee || 0;
      const discountAmount = order.discountAmount || 0;

      // Add optional services
      if (clientReviewFee > 0) {
        items.push({
          description: 'Client Review Service',
          quantity: 1,
          unitPrice: clientReviewFee,
          total: clientReviewFee
        });
      }

      if (rushFee > 0) {
        items.push({
          description: 'Rush Delivery',
          quantity: 1,
          unitPrice: rushFee,
          total: rushFee
        });
      }

      // Calculate final totals
      const invoiceSubtotal = sitesSubtotal + clientReviewFee + rushFee;
      const finalTotal = invoiceSubtotal - discountAmount;

      // Create invoice data
      const invoiceData = {
        invoiceNumber,
        issueDate: now.toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
        items,
        subtotal: invoiceSubtotal,
        discount: discountAmount,
        total: finalTotal,
        billingInfo: account ? {
          name: account.contactName || '',
          company: account.companyName || '',
          email: account.email,
          address: account.billingAddress || undefined
        } : undefined
      };

      // Update order with correct pricing and invoice data
      const updatedOrder = await db.update(orders)
        .set({
          // Update pricing to reflect actual costs
          subtotalRetail: sitesSubtotal,
          totalRetail: finalTotal,
          totalWholesale: wholesaleTotal,
          profitMargin: serviceFeeTotal,
          discountAmount: discountAmount,
          // State and invoice tracking  
          state: 'payment_pending',
          invoicedAt: new Date(),
          invoiceData,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      // If using line items, update their status to invoiced
      if (useLineItems) {
        // Get existing line items to preserve metadata - EXCLUDE cancelled items from invoicing
        const existingLineItems = await db.query.orderLineItems.findMany({
          where: and(
            eq(orderLineItems.orderId, orderId),
            sql`${orderLineItems.status} NOT IN ('cancelled', 'refunded')`,
            sql`${orderLineItems.cancelledAt} IS NULL`
          )
        });
        
        // Update each line item with merged metadata
        for (const item of existingLineItems) {
          await db.update(orderLineItems)
            .set({
              status: 'invoiced',
              metadata: {
                ...(item.metadata as any || {}),
                invoicedAt: new Date().toISOString(),
                invoiceNumber
              },
              modifiedAt: new Date()
            })
            .where(eq(orderLineItems.id, item.id));
        }
      }
      
      return NextResponse.json({
        success: true,
        order: updatedOrder[0],
        message: isRegenerate ? 'Invoice regenerated successfully' : 'Invoice generated successfully',
        invoiceMethod: useLineItems ? 'line_items' : 'submissions',
        itemCount: approvedItems.length,
        approvedSites: approvedItems.length
      });

    } else if (action === 'mark_paid') {
      // Only internal users can mark as paid
      if (session.userType !== 'internal') {
        return NextResponse.json({ error: 'Only internal users can mark orders as paid' }, { status: 403 });
      }

      // Check if order is invoiced
      if (!order.invoicedAt) {
        return NextResponse.json({ 
          error: 'Cannot mark as paid - invoice not generated yet' 
        }, { status: 400 });
      }

      // Update order to paid status with payment_received state
      const updatedOrder = await db.update(orders)
        .set({
          status: 'paid',
          state: 'payment_received',
          paidAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      return NextResponse.json({
        success: true,
        order: updatedOrder[0],
        message: 'Order marked as paid successfully'
      });

    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "generate_invoice" or "mark_paid"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing invoice action:', error);
    return NextResponse.json(
      { error: 'Failed to process invoice action', details: error },
      { status: 500 }
    );
  }
}