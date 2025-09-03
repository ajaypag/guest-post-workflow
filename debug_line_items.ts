import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Client } from 'pg';
import * as schema from '@/lib/db/schema';

async function debugLineItems() {
  console.log('🔍 Debugging line items for publisher column display...');
  
  // Database connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_order_flow';
  console.log('🔗 Database connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));
  
  const client = new Client({ connectionString });
  await client.connect();
  const db = drizzle(client, { schema });
  
  const orderId = 'b4e262ad-4a72-405c-bde6-262211905518';
  
  // Get line items for the order
  console.log('📋 Fetching line items...');
  const lineItems = await db
    .select()
    .from(schema.guestPostItems)
    .where(eq(schema.guestPostItems.orderId, orderId));
    
  console.log(`✅ Found ${lineItems.length} line items:`);
  
  lineItems.forEach((item, idx) => {
    console.log(`\n📄 Line Item ${idx + 1}:`);
    console.log('   ID:', item.id);
    console.log('   Status:', item.status);
    console.log('   Assigned Domain:', item.assignedDomain || 'NONE');
    console.log('   Publisher ID:', item.publisherId || 'NONE');
    console.log('   Publisher Offering ID:', item.publisherOfferingId || 'NONE');
    console.log('   Publisher Price:', item.publisherPrice || 'NONE');
    console.log('   Metadata:', item.metadata ? JSON.stringify(item.metadata, null, 2) : 'NONE');
  });
  
  // Check the showSites logic conditions
  const order = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  if (order.length > 0) {
    const o = order[0];
    console.log('\n🎯 Display Logic Analysis:');
    console.log('   Order Status:', o.status);
    console.log('   Order State:', o.state);
    
    const showSites = o.state === 'awaiting_review' || o.state === 'sites_ready' || 
                      o.state === 'client_reviewing' || o.state === 'payment_pending' || 
                      o.state === 'in_progress' || o.status === 'completed' ||
                      lineItems.some(item => item.assignedDomain);
                      
    console.log('   showSites result:', showSites);
    
    const hasAssignedDomains = lineItems.some(item => item.assignedDomain);
    console.log('   Has assigned domains:', hasAssignedDomains);
    
    const hasPublisherData = lineItems.some(item => item.publisherId);
    console.log('   Has publisher data:', hasPublisherData);
    
    console.log('\n💡 Publisher Column Requirements:');
    console.log('   1. userType === "internal" (✅ should be true)');
    console.log('   2. showSites === true (✅', showSites, ')');
    console.log('   → Publisher column should be:', showSites ? 'VISIBLE' : 'HIDDEN');
    
    if (showSites && !hasPublisherData) {
      console.log('\n⚠️  Issue: showSites=true but no publisher attribution data');
      console.log('   Line items need publisherId and publisherOfferingId');
    }
  }
  
  await client.end();
}

debugLineItems().catch(console.error).finally(() => process.exit(0));