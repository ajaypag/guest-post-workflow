// Debug script to check line items causing invoice generation issues
import { db } from './lib/db/connection.js';
import { orderLineItems } from './lib/db/orderLineItemSchema.js';
import { eq, and, sql } from 'drizzle-orm';

const orderId = '1176a884-7825-4c73-99f3-9d3fae687bf8';

console.log(`\n=== DEBUGGING INVOICE ERROR FOR ORDER ${orderId} ===\n`);

// Get all line items for the order
const allItems = await db.query.orderLineItems.findMany({
  where: eq(orderLineItems.orderId, orderId),
  with: {
    client: true
  }
});

console.log(`Total line items in order: ${allItems.length}\n`);

// Filter out cancelled/refunded items (what invoice API does)
const activeItems = allItems.filter(item => 
  item.status !== 'cancelled' && 
  item.status !== 'refunded' && 
  !item.cancelledAt
);

console.log(`Active line items: ${activeItems.length}\n`);

// Check for problematic items
const unassignedItems = activeItems.filter(item => !item.assignedDomainId);
const pendingItems = activeItems.filter(item => 
  item.status === 'pending' || item.status === 'draft'
);
const unusedItems = [...new Set([...unassignedItems, ...pendingItems])]; // Remove duplicates

console.log(`=== PROBLEMATIC ITEMS ANALYSIS ===`);
console.log(`Unassigned items (no assignedDomainId): ${unassignedItems.length}`);
console.log(`Pending/draft items: ${pendingItems.length}`);
console.log(`Total unused items: ${unusedItems.length}\n`);

if (unusedItems.length > 0) {
  console.log(`❌ INVOICE ERROR: Found ${unusedItems.length} unused items that need to be cancelled\n`);
  
  console.log(`Unused items details:`);
  unusedItems.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.id.slice(0,8)}:`);
    console.log(`     Status: ${item.status}`);
    console.log(`     AssignedDomainId: ${item.assignedDomainId || 'NULL'}`);
    console.log(`     AssignedDomain: ${item.assignedDomain || 'NULL'}`);
    console.log(`     Client: ${item.client?.name || 'Unknown'}`);
    console.log(`     Target: ${item.targetPageUrl || 'None'}`);
    console.log(`     Metadata: ${JSON.stringify(item.metadata, null, 2)}`);
    console.log();
  });
} else {
  console.log(`✅ No unused items - should be able to generate invoice\n`);
}

// Check approved items that would be invoiced
const approvedItems = activeItems.filter(item => {
  // Skip excluded items
  if (item.metadata?.inclusionStatus === 'excluded') {
    return false;
  }
  
  // Check if qualifies for invoice
  return (
    item.status === 'approved' || 
    item.status === 'assigned' || 
    item.status === 'confirmed' ||
    item.status === 'invoiced' ||
    (item.assignedDomainId && item.metadata?.inclusionStatus === 'included')
  );
});

console.log(`=== ITEMS THAT WOULD BE INVOICED ===`);
console.log(`Approved/assigned items for invoice: ${approvedItems.length}\n`);

if (approvedItems.length > 0) {
  approvedItems.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.id.slice(0,8)}:`);
    console.log(`     Status: ${item.status}`);
    console.log(`     Domain: ${item.assignedDomain || 'None'}`);
    console.log(`     Client: ${item.client?.name}`);
    console.log(`     Price: $${(item.estimatedPrice || 0) / 100}`);
    console.log(`     Inclusion: ${item.metadata?.inclusionStatus || 'Not set'}`);
    console.log();
  });
} else {
  console.log(`❌ No approved items found - cannot generate invoice`);
}

console.log(`=== SUMMARY ===`);
console.log(`To fix invoice generation:`);
if (unusedItems.length > 0) {
  console.log(`1. Cancel ${unusedItems.length} unused items, OR`);
  console.log(`2. Assign domains to unassigned items, OR`);
  console.log(`3. Change status from draft/pending to assigned`);
}
if (approvedItems.length === 0) {
  console.log(`4. Ensure at least one item has status 'assigned' or 'approved'`);
}