import { db } from '../lib/db/connection';
import { orderLineItems } from '../lib/db/orderLineItemSchema';
import { eq } from 'drizzle-orm';

async function checkOrderTargetPages() {
  const orderId = 'a3ca24b7-9a92-4c00-952e-bb71606af8b9';
  
  try {
    const items = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));
    
    console.log(`\nFound ${items.length} line items for order ${orderId}:\n`);
    
    items.forEach((item, index) => {
      console.log(`Line Item ${index + 1}:`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Client ID: ${item.clientId}`);
      console.log(`  Target Page ID: ${item.targetPageId || 'NULL'}`);
      console.log(`  Target Page IDs: ${item.targetPageIds ? JSON.stringify(item.targetPageIds) : 'NULL'}`);
      console.log(`  Target Page URL: ${item.targetPageUrl || 'NULL'}`);
      console.log('---');
    });
    
    // Count how many have target page IDs
    const withTargetPageIds = items.filter(item => 
      item.targetPageIds && Array.isArray(item.targetPageIds) && item.targetPageIds.length > 0
    );
    
    const withSingleTargetPageId = items.filter(item => item.targetPageId);
    
    console.log(`\nSummary:`);
    console.log(`  Total line items: ${items.length}`);
    console.log(`  With targetPageIds array: ${withTargetPageIds.length}`);
    console.log(`  With single targetPageId: ${withSingleTargetPageId.length}`);
    
    // Check if this is actually a multi-client order
    const uniqueClients = new Set(items.map(item => item.clientId));
    console.log(`  Unique clients: ${uniqueClients.size}`);
    
    if (uniqueClients.size > 1) {
      console.log(`\nThis is a multi-client order with clients:`);
      uniqueClients.forEach(clientId => {
        const clientItems = items.filter(item => item.clientId === clientId);
        console.log(`  - ${clientId}: ${clientItems.length} line items`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkOrderTargetPages();