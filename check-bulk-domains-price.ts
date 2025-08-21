import { db } from './lib/db/connection';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { eq, inArray } from 'drizzle-orm';

async function checkBulkDomainsPricing() {
  const testDomains = ['valasys.com', 'trackmyhashtag.com'];
  
  console.log('\n=== Checking bulk analysis domains pricing ===\n');
  
  const domains = await db.query.bulkAnalysisDomains.findMany({
    where: inArray(bulkAnalysisDomains.domain, testDomains)
  });
  
  domains.forEach(d => {
    console.log(`Domain: ${d.domain}`);
    console.log(`  ID: ${d.id}`);
    console.log(`  Estimated Price: ${d.estimatedPrice}`);
    console.log(`  Domain Rating: ${d.domainRating}`);
    console.log(`  Traffic: ${d.traffic}`);
    console.log(`  Metadata:`, d.metadata);
    console.log('---');
  });
  
  process.exit(0);
}

checkBulkDomainsPricing().catch(console.error);