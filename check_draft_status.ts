import { db } from './lib/db/connection';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { eq, and } from 'drizzle-orm';

async function checkDraftStatus() {
  const items = await db
    .select()
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.orderId, '474e3625-4140-4919-870e-94497bc81202'),
        eq(orderLineItems.assignedDomain, 'top4.com.au')
      )
    );

  if (items.length > 0) {
    const item = items[0];
    console.log('Line Item Details for top4.com.au:');
    console.log('  ID:', item.id);
    console.log('  Status:', item.status);
    console.log('  Publisher Status:', item.publisherStatus);
    console.log('  Publisher ID:', item.publisherId);
    console.log('  Publisher Price:', item.publisherPrice);
    console.log('  Inclusion Status:', item.inclusionStatus);
    console.log('  Target Page URL:', item.targetPageUrl);
    console.log('  Anchor Text:', item.anchorText);
    console.log('  Modified At:', item.modifiedAt);
    console.log('  Metadata:', JSON.stringify(item.metadata, null, 2));
    
    console.log('\n\n=== STATUS ANALYSIS ===');
    if (item.status === 'draft') {
      console.log('❗ Item is in DRAFT status');
      console.log('\nPossible reasons:');
      console.log('1. Missing target page URL:', !item.targetPageUrl ? '❌ YES - This is likely the issue!' : '✅ No, has URL');
      console.log('2. Missing anchor text:', !item.anchorText ? '❌ YES - This could be an issue!' : '✅ No, has anchor text');
      console.log('3. Not included in order:', item.inclusionStatus !== 'included' ? '❌ YES - Item is excluded!' : '✅ No, item is included');
      console.log('4. Missing publisher:', !item.publisherId ? '❌ YES - No publisher assigned!' : '✅ No, has publisher');
      
      console.log('\n📋 TO FIX DRAFT STATUS:');
      if (!item.targetPageUrl) {
        console.log('  → Add a target page URL');
      }
      if (!item.anchorText) {
        console.log('  → Add anchor text');
      }
      if (item.inclusionStatus !== 'included') {
        console.log('  → Change inclusion status to "included"');
      }
      if (!item.publisherId) {
        console.log('  → Assign a publisher');
      }
    }
  } else {
    console.log('No line item found for top4.com.au');
  }
  
  process.exit(0);
}

checkDraftStatus().catch(console.error);