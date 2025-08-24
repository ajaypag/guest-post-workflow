import { db } from './lib/db/connection';
import { accounts, clients, accountClientRelations } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkAccountSetup() {
  // Find zaid user
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.email, 'zaid@ppcmasterminds.com'),
    with: {
      accountClientRelations: {
        with: {
          client: true
        }
      }
    }
  });
  
  if (!account) {
    console.log('Account not found');
    return;
  }
  
  console.log('Account found:', account.name, account.email);
  console.log('Account ID:', account.id);
  console.log('Account has client relations:', account.accountClientRelations?.length || 0);
  
  if (account.accountClientRelations && account.accountClientRelations.length > 0) {
    console.log('\nClient Relations:');
    account.accountClientRelations.forEach(rel => {
      console.log(`  - Client: ${rel.client?.name} (${rel.clientId})`);
      console.log(`    Role: ${rel.role}`);
    });
  } else {
    console.log('\n⚠️ No client relations found for this account');
    console.log('This is why session.clientId is undefined');
    
    // Find the client we want to associate
    const ppcClient = await db.query.clients.findFirst({
      where: eq(clients.id, 'aca65919-c0f9-49d0-888b-2c488f7580dc')
    });
    
    if (ppcClient) {
      console.log('\nFound client to associate:', ppcClient.name);
      console.log('You need to create an accountClientRelation to link them');
    }
  }
}

checkAccountSetup().catch(console.error);