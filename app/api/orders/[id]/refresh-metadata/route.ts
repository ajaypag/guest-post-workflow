import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { websites } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { EnhancedOrderPricingService } from '@/lib/services/enhancedOrderPricingService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    
    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Don't allow refresh for paid or completed orders
    if (order.status === 'paid' || order.status === 'completed') {
      return NextResponse.json({ 
        error: 'Cannot refresh metadata for paid or completed orders' 
      }, { status: 400 });
    }
    
    // Get all line items for this order
    const lineItems = await db.query.orderLineItems.findMany({
      where: eq(orderLineItems.orderId, orderId),
      with: {
        assignedDomain: true
      }
    });
    
    if (lineItems.length === 0) {
      return NextResponse.json({ 
        error: 'No line items found for this order' 
      }, { status: 404 });
    }
    
    let updatedCount = 0;
    const errors: string[] = [];
    
    // Process each line item
    for (const lineItem of lineItems) {
      try {
        // Get the domain from assigned domain
        const domain = lineItem.assignedDomain?.domain || lineItem.assignedDomain;
        
        if (!domain) {
          console.log(`Line item ${lineItem.id} has no assigned domain, skipping`);
          continue;
        }
        
        // Normalize domain for matching
        const normalizedDomain = typeof domain === 'string' 
          ? domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
          : null;
        
        if (!normalizedDomain) {
          console.log(`Could not normalize domain for line item ${lineItem.id}`);
          continue;
        }
        
        // Get latest data from websites table
        const website = await db.query.websites.findFirst({
          where: sql`LOWER(REPLACE(REPLACE(REPLACE(${websites.domain}, 'https://', ''), 'http://', ''), 'www.', '')) = ${normalizedDomain}`
        });
        
        if (!website) {
          console.log(`No website found for domain ${normalizedDomain}`);
          continue;
        }
        
        // Get new pricing from website
        // Note: EnhancedOrderPricingService.getWebsitePrice doesn't use traffic directly,
        // but we're storing it in metadata for reference
        const pricing = await EnhancedOrderPricingService.getWebsitePrice(
          website.id,
          normalizedDomain,
          {
            quantity: 1,
            accountId: order.accountId || undefined
          }
        );
        
        // Update metadata with latest website data
        const currentMetadata = (lineItem.metadata as any) || {};
        const updatedMetadata = {
          ...currentMetadata,
          domainRating: website.domainRating,
          traffic: website.totalTraffic, // Using totalTraffic from websites table
          refreshedAt: new Date().toISOString(),
          refreshedFrom: 'websites_table'
        };
        
        // Update the line item with new data
        // Note: prices from getWebsitePrice are already in cents
        await db.update(orderLineItems)
          .set({
            estimatedPrice: pricing.retailPrice,
            wholesalePrice: pricing.wholesalePrice,
            metadata: updatedMetadata,
            modifiedAt: new Date()
          })
          .where(eq(orderLineItems.id, lineItem.id));
        
        updatedCount++;
        console.log(`Updated line item ${lineItem.id} with DR: ${website.domainRating}, Traffic: ${website.totalTraffic || 0}, Price: $${pricing.retailPrice / 100}`);
        
      } catch (error) {
        console.error(`Error updating line item ${lineItem.id}:`, error);
        errors.push(`Failed to update line item ${lineItem.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Recalculate order totals based on updated line items
    if (updatedCount > 0) {
      const updatedLineItems = await db.query.orderLineItems.findMany({
        where: eq(orderLineItems.orderId, orderId)
      });
      
      // Filter for active items only (not cancelled)
      const includedItems = updatedLineItems.filter(item => 
        item.status !== 'cancelled'
      );
      
      const newTotalRetail = includedItems.reduce((sum, item) => 
        sum + (item.approvedPrice || item.estimatedPrice || 0), 0
      );
      
      const newTotalWholesale = includedItems.reduce((sum, item) => 
        sum + (item.wholesalePrice || 0), 0
      );
      
      const newProfitMargin = newTotalRetail - newTotalWholesale;
      
      // Update order totals
      await db.update(orders)
        .set({
          totalRetail: newTotalRetail,
          totalWholesale: newTotalWholesale,
          profitMargin: newProfitMargin,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    }
    
    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: lineItems.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully updated ${updatedCount} of ${lineItems.length} line items with latest website data`
    });
    
  } catch (error) {
    console.error('Error refreshing metadata:', error);
    return NextResponse.json(
      { error: 'Failed to refresh metadata' },
      { status: 500 }
    );
  }
}