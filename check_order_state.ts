import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Client } from 'pg';
import * as schema from '@/lib/db/schema';

async function checkOrderState() {
  console.log('🔍 Checking test order state and conditions...');
  
  // Database connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_order_flow';
  console.log('🔗 Database connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));
  
  const client = new Client({ connectionString });
  await client.connect();
  const db = drizzle(client, { schema });
  
  const orderId = 'b4e262ad-4a72-405c-bde6-262211905518';
  
  const order = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  
  if (order.length === 0) {
    console.log('❌ Order not found');
    return;
  }
  
  const o = order[0];
  console.log('\n📋 Order Details:');
  console.log('   Status:', o.status);
  console.log('   State:', o.state);
  console.log('   Order Type:', o.orderType);
  
  // Check showSites logic from LineItemsDisplay
  const showSites = o.state === 'awaiting_review' || o.state === 'sites_ready' || 
                    o.state === 'client_reviewing' || o.state === 'payment_pending' || 
                    o.state === 'in_progress' || o.status === 'completed';
  
  console.log('\n🎯 Publisher Column Display Logic:');
  console.log('   showSites condition:', showSites);
  console.log('   Expected for internal users: userType === "internal" && showSites');
  console.log('   Current result: internal && showSites =', showSites);
  
  console.log('\n💡 To show Publisher column, order needs:');
  console.log('   - Status: completed OR');
  console.log('   - State: awaiting_review, sites_ready, client_reviewing, payment_pending, or in_progress');
  
  if (!showSites) {
    console.log('\n⚠️  ISSUE IDENTIFIED:');
    console.log('   Publisher column hidden because showSites = false');
    console.log('   Current state/status doesn\'t meet display criteria');
    console.log('   Need to update order state to show publisher attribution');
  }
  
  await client.end();
}

checkOrderState().catch(console.error).finally(() => process.exit(0));