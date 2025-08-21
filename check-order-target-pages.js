const { db } = require('./lib/db');
const { lineItems } = require('./lib/db/schema');
const { eq } = require('drizzle-orm');

async function checkOrderTargetPages() {
  const orderId = 'a3ca24b7-9a92-4c00-952e-bb71606af8b9';
  
  try {
    const items = await db
      .select()
      .from(lineItems)
      .where(eq(lineItems.orderId, orderId))
      .limit(5);
    
    console.log(`\nFound ${items.length} line items for order ${orderId}:\n`);
    
    items.forEach(item => {
      console.log(`Line Item ID: ${item.id}`);
      console.log(`  Target Page ID: ${item.targetPageId || 'NULL'}`);
      console.log(`  Target Page IDs: ${item.targetPageIds ? JSON.stringify(item.targetPageIds) : 'NULL'}`);
      console.log(`  Target Page URL: ${item.targetPageUrl || 'NULL'}`);
      console.log('---');
    });
    
    // Count how many have target page IDs
    const withTargetPageIds = items.filter(item => 
      item.targetPageIds && Array.isArray(item.targetPageIds) && item.targetPageIds.length > 0
    );
    
    console.log(`\n${withTargetPageIds.length} out of ${items.length} line items have target page IDs assigned\n`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkOrderTargetPages();