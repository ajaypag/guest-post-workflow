import { db } from './lib/db/connection';
import { accounts, clients, accountClientRelations } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkAccountSetup() {
  // Find zaid user
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.email, 'zaid@ppcmasterminds.com')
  });
  
  if (!account) {
    console.log('Account not found');
    return;
  }
  
  console.log('Account found:', account.name, account.email);
  console.log('Account ID:', account.id);
  
  // Check if there are any client relations
  const relations = await db.select()
    .from(accountClientRelations)
    .where(eq(accountClientRelations.accountId, account.id));
  
  console.log('Account has client relations:', relations.length);
  
  if (relations.length > 0) {
    console.log('\nClient Relations:');
    for (const rel of relations) {
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, rel.clientId)
      });
      console.log(`  - Client: ${client?.name} (${rel.clientId})`);
      console.log(`    Role: ${rel.role}`);
    }
  } else {
    console.log('\n⚠️ No client relations found for this account');
    console.log('This is why session.clientId is undefined');
    console.log('\nCreating client relation now...');
    
    // Create the relation
    await db.insert(accountClientRelations).values({
      accountId: account.id,
      clientId: 'aca65919-c0f9-49d0-888b-2c488f7580dc',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Created client relation for PPC Masterminds');
  }
}

checkAccountSetup().catch(console.error);