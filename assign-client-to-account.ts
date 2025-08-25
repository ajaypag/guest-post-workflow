import { db } from './lib/db/connection';
import { accounts, clients, bulkAnalysisDomains } from './lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

async function assignClientToAccount() {
  // Find a client with some domains
  const clientsWithDomains = await db
    .select({
      clientId: bulkAnalysisDomains.clientId,
      domainCount: sql<number>`count(*)::int`.as('domainCount')
    })
    .from(bulkAnalysisDomains)
    .groupBy(bulkAnalysisDomains.clientId)
    .orderBy(desc(sql`count(*)`))
    .limit(5);
  
  console.log('\n=== CLIENTS WITH DOMAINS ===');
  for (const c of clientsWithDomains) {
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, c.clientId)
    });
    console.log(`${client?.name} (ID: ${c.clientId}) - ${c.domainCount} domains`);
  }
  
  // Let's assign the first client with domains to the account
  if (clientsWithDomains.length > 0) {
    const selectedClientId = clientsWithDomains[0].clientId;
    const selectedClient = await db.query.clients.findFirst({
      where: eq(clients.id, selectedClientId)
    });
    
    console.log(`\n✅ Assigning client "${selectedClient?.name}" to orders@outreachlabs.com`);
    
    // Update the account
    await db
      .update(accounts)
      .set({ 
        primaryClientId: selectedClientId,
        updatedAt: new Date()
      })
      .where(eq(accounts.email, 'orders@outreachlabs.com'));
    
    console.log('✅ Account updated successfully!');
    
    // Verify the update
    const updatedAccount = await db.query.accounts.findFirst({
      where: eq(accounts.email, 'orders@outreachlabs.com'),
      with: {
        primaryClient: true
      }
    });
    
    console.log('\n=== UPDATED ACCOUNT ===');
    console.log('Email:', updatedAccount?.email);
    console.log('Primary Client:', updatedAccount?.primaryClient?.name);
    console.log('Primary Client ID:', updatedAccount?.primaryClientId);
  }
}

assignClientToAccount();