import { db } from './lib/db/connection';
import { accounts, clients, bulkAnalysisDomains, bulkAnalysisProjects } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkAccountClient() {
  // Check the orders@outreachlabs.com account
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.email, 'orders@outreachlabs.com'),
    with: {
      primaryClient: true
    }
  });

  console.log('\n=== ACCOUNT DETAILS ===');
  console.log('Email:', account?.email);
  console.log('ID:', account?.id);
  console.log('Primary Client ID:', account?.primaryClientId);
  console.log('Primary Client Name:', account?.primaryClient?.name);
  
  if (account?.primaryClientId) {
    // Check if there are any domains for this client
    const domainCount = await db
      .select({ count: bulkAnalysisDomains.id })
      .from(bulkAnalysisDomains)
      .where(eq(bulkAnalysisDomains.clientId, account.primaryClientId));
    
    console.log('\n=== DOMAIN COUNT ===');
    console.log('Domains for this client:', domainCount[0]?.count || 0);
    
    // Get some sample domains
    const sampleDomains = await db.query.bulkAnalysisDomains.findMany({
      where: eq(bulkAnalysisDomains.clientId, account.primaryClientId),
      limit: 5
    });
    
    console.log('\n=== SAMPLE DOMAINS ===');
    sampleDomains.forEach(d => {
      console.log(`- ${d.domain} (Status: ${d.qualificationStatus})`);
    });
    
    // Check projects
    const projects = await db.query.bulkAnalysisProjects.findMany({
      where: eq(bulkAnalysisProjects.clientId, account.primaryClientId)
    });
    
    console.log('\n=== PROJECTS ===');
    projects.forEach(p => {
      console.log(`- ${p.name} (ID: ${p.id})`);
    });
  } else {
    console.log('\n⚠️  WARNING: Account has no primaryClientId set!');
    
    // Try to find any clients that might be associated
    const allClients = await db.query.clients.findMany({
      limit: 10
    });
    
    console.log('\n=== AVAILABLE CLIENTS ===');
    allClients.forEach(c => {
      console.log(`- ${c.name} (ID: ${c.id})`);
    });
  }
}

checkAccountClient();