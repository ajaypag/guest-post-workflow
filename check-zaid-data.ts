import { db } from './lib/db/connection';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { accounts, clients } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkUserData() {
  // Find zaid user
  const user = await db.query.accounts.findFirst({
    where: eq(accounts.email, 'zaid@ppcmasterminds.com')
  });
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User found:', user.name, user.email);
  console.log('User ID:', user.id);
  
  // Get client for this user
  const userClient = await db.query.clients.findFirst({
    where: eq(clients.name, 'PPC Masterminds')
  });
  
  if (userClient) {
    console.log('Client found:', userClient.name);
    console.log('Client ID:', userClient.id);
    
    // Get domains for this client with targetMatchData
    const domains = await db.select()
      .from(bulkAnalysisDomains)
      .where(eq(bulkAnalysisDomains.clientId, userClient.id))
      .limit(10);
    
    console.log('\nDomains for this client:', domains.length);
    
    for (const domain of domains) {
      if (domain.targetMatchData) {
        console.log('\n=== Domain:', domain.domain, '===');
        const data = domain.targetMatchData as any;
        
        if (data.target_analysis && Array.isArray(data.target_analysis)) {
          const allDirect = data.target_analysis.flatMap((a: any) => a.evidence?.direct_keywords || []);
          const allRelated = data.target_analysis.flatMap((a: any) => a.evidence?.related_keywords || []);
          
          console.log('Direct keywords count:', allDirect.length);
          if (allDirect.length > 0) {
            console.log('Direct keywords sample:', allDirect.slice(0, 3));
          }
          console.log('Related keywords count:', allRelated.length);
          if (allRelated.length > 0) {
            console.log('Related keywords sample:', allRelated.slice(0, 3));
          }
        }
      }
    }
  }
}

checkUserData().catch(console.error);