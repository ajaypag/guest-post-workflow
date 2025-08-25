import { db } from './lib/db/connection';
import { accounts } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function fixAccountClient() {
  // Update zaid account to have the correct primaryClientId
  const result = await db.update(accounts)
    .set({
      primaryClientId: 'aca65919-c0f9-49d0-888b-2c488f7580dc',
      updatedAt: new Date()
    })
    .where(eq(accounts.email, 'zaid@ppcmasterminds.com'))
    .returning();
  
  if (result.length > 0) {
    console.log('✅ Updated account:', result[0].email);
    console.log('   primaryClientId set to:', result[0].primaryClientId);
    console.log('\n🔄 Please log out and log back in for the changes to take effect');
  } else {
    console.log('❌ Account not found');
  }
}

fixAccountClient().catch(console.error);