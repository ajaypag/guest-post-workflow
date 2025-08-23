import { db } from './lib/db/connection';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { eq, and, or, inArray } from 'drizzle-orm';

async function checkDomainCount() {
  const zaidClientId = 'aca65919-c0f9-49d0-888b-2c488f7580dc';
  
  // Count all domains for this client
  const allDomains = await db.select()
    .from(bulkAnalysisDomains)
    .where(eq(bulkAnalysisDomains.clientId, zaidClientId));
  
  console.log('Total domains for Zaid client:', allDomains.length);
  
  // Count qualified domains (matching the filter in the UI)
  const qualifiedDomains = await db.select()
    .from(bulkAnalysisDomains)
    .where(and(
      eq(bulkAnalysisDomains.clientId, zaidClientId),
      or(
        eq(bulkAnalysisDomains.qualificationStatus, 'high_quality'),
        eq(bulkAnalysisDomains.qualificationStatus, 'good_quality')
      )
    ));
  
  console.log('Qualified domains (high_quality or good_quality):', qualifiedDomains.length);
  
  // List all domains
  console.log('\nAll domains:');
  allDomains.forEach(d => {
    console.log(`  - ${d.domain} (${d.qualificationStatus || 'no status'})`);
  });
  
  console.log('\nWith limit 50 per page:');
  console.log('  Page 1: domains 1-50');
  console.log('  Page 2: would be empty if total < 50');
  console.log(`  Total pages needed: ${Math.ceil(allDomains.length / 50)}`);
}

checkDomainCount().catch(console.error);