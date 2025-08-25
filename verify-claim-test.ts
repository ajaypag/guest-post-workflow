import { db } from './lib/db/connection';
import { accounts } from './lib/db/accountSchema';
import { clients } from './lib/db/schema';
import { bulkAnalysisProjects } from './lib/db/bulkAnalysisSchema';
import { targetPages } from './lib/db/schema';
import { vettedSitesRequests } from './lib/db/vettedSitesRequestSchema';
import { eq } from 'drizzle-orm';

async function verifyClaimTest() {
  console.log('=== VERIFY CLAIM TEST RESULTS ===\n');
  
  // Check if request was claimed
  const request = await db
    .select()
    .from(vettedSitesRequests)
    .where(eq(vettedSitesRequests.shareToken, '31b539da-3e32-411f-9b8b-ffd14b646e04'))
    .limit(1);
  
  if (request[0]) {
    console.log('📋 REQUEST STATUS:');
    console.log('  Claimed:', request[0].claimedByAccount ? 'Yes ✅' : 'No ❌');
    console.log('  Claimed At:', request[0].claimedAt || 'Not claimed');
    console.log('  Claimed By Account:', request[0].claimedByAccount || 'None');
    
    if (request[0].claimedByAccount) {
      // Check the claiming account
      const account = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, request[0].claimedByAccount))
        .limit(1);
      
      if (account[0]) {
        console.log('\n👤 CLAIMING ACCOUNT:');
        console.log('  Email:', account[0].email);
        console.log('  Name:', account[0].contactName);
        console.log('  Company:', account[0].companyName);
        console.log('  Role:', account[0].role);
        console.log('  Status:', account[0].status);
        
        // Check client
        const client = await db
          .select()
          .from(clients)
          .where(eq(clients.accountId, account[0].id))
          .limit(1);
        
        if (client[0]) {
          console.log('\n🏢 CLIENT CREATED:');
          console.log('  ID:', client[0].id);
          console.log('  Name:', client[0].name);
          
          // Check projects
          const projects = await db
            .select()
            .from(bulkAnalysisProjects)
            .where(eq(bulkAnalysisProjects.clientId, client[0].id));
          
          console.log('\n📊 PROJECTS:', projects.length);
          projects.forEach((p, i) => {
            console.log('  ' + (i+1) + '.', p.name, '(ID:', p.id + ')');
          });
          
          // Check target pages
          const pages = await db
            .select()
            .from(targetPages)
            .where(eq(targetPages.clientId, client[0].id));
          
          console.log('\n🎯 TARGET PAGES:', pages.length);
          pages.forEach((p, i) => {
            console.log('  ' + (i+1) + '.', p.url);
          });
        }
      }
    }
  } else {
    console.log('❌ Test request not found');
  }
}

verifyClaimTest().catch(console.error);