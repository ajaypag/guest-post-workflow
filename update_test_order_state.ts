import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Client } from 'pg';
import * as schema from '@/lib/db/schema';

async function updateTestOrderState() {
  console.log('🔄 Updating test order state to show publisher column...');
  
  // Database connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_order_flow';
  console.log('🔗 Database connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));
  
  const client = new Client({ connectionString });
  await client.connect();
  const db = drizzle(client, { schema });
  
  const orderId = 'b4e262ad-4a72-405c-bde6-262211905518';
  
  // Update order to 'in_progress' state which will trigger showSites = true
  console.log('📝 Updating order state to "in_progress" and status to "confirmed"...');
  
  await db.update(schema.orders)
    .set({
      state: 'in_progress',
      status: 'confirmed'
    })
    .where(eq(schema.orders.id, orderId));
  
  // Verify the update
  const updatedOrder = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  
  if (updatedOrder.length > 0) {
    const order = updatedOrder[0];
    console.log('✅ Order updated successfully:');
    console.log('   Status:', order.status);
    console.log('   State:', order.state);
    
    // Check showSites logic
    const showSites = order.state === 'awaiting_review' || order.state === 'sites_ready' || 
                      order.state === 'client_reviewing' || order.state === 'payment_pending' || 
                      order.state === 'in_progress' || order.status === 'completed';
    
    console.log('\n🎯 Publisher Column Display:');
    console.log('   showSites condition:', showSites);
    console.log('   For internal users: userType === "internal" && showSites =', showSites);
    
    if (showSites) {
      console.log('\n✅ SUCCESS: Publisher column will now be visible!');
      console.log('   Ready for frontend testing');
    } else {
      console.log('\n❌ STILL HIDDEN: Need different state');
    }
  }
  
  await client.end();
}

updateTestOrderState().catch(console.error).finally(() => process.exit(0));