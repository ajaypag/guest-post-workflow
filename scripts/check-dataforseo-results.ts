import { db } from '../lib/db/connection';
import { dataForSeoResults } from '../lib/db/bulkAnalysisSchema';
import { eq, or, like } from 'drizzle-orm';

async function checkDataForSeoResults() {
  const domainId = '82927d77-d132-4adc-ae1d-5842582409c7';
  const domainName = 'naturaplug.com';
  
  try {
    console.log('\n=== DATAFORSEO RESULTS FOR NATURAPLUG.COM ===\n');
    
    // Check by domain ID
    const resultsByDomainId = await db
      .select()
      .from(dataForSeoResults)
      .where(eq(dataForSeoResults.domainId, domainId));
    
    console.log(`Found ${resultsByDomainId.length} results by domain ID\n`);
    
    // Check by domain name in target field
    const resultsByTarget = await db
      .select()
      .from(dataForSeoResults)
      .where(like(dataForSeoResults.target, `%${domainName}%`));
    
    console.log(`Found ${resultsByTarget.length} results by target domain name\n`);
    
    // Display results
    const allResults = [...resultsByDomainId, ...resultsByTarget];
    const uniqueResults = Array.from(new Map(allResults.map(r => [r.id, r])).values());
    
    uniqueResults.forEach((result, index) => {
      console.log(`Result ${index + 1}:`);
      console.log('  ID:', result.id);
      console.log('  Domain ID:', result.domainId);
      console.log('  Target:', result.target);
      console.log('  Domain Rating:', result.domainRating);
      console.log('  Organic Traffic:', result.organicTraffic);
      console.log('  Backlinks:', result.backlinks);
      console.log('  Referring Domains:', result.referringDomains);
      console.log('  Keywords:', result.keywords?.length || 0);
      console.log('  Created:', result.createdAt);
      console.log('---');
    });
    
    if (uniqueResults.length === 0) {
      console.log('No DataForSEO results found for this domain');
      console.log('\nThis explains why DR and Traffic are blank!');
      console.log('The domain needs to be analyzed with DataForSEO to get these metrics.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDataForSeoResults();