import { db } from '../lib/db/connection';
import { bulkAnalysisDomains } from '../lib/db/bulkAnalysisSchema';
import { isNotNull } from 'drizzle-orm';

async function checkV2Data() {
  console.log('🔍 Checking V2 data in database...\n');

  // Get domains with V2 data
  const domainsWithV2 = await db
    .select({
      id: bulkAnalysisDomains.id,
      domain: bulkAnalysisDomains.domain,
      qualificationStatus: bulkAnalysisDomains.qualificationStatus,
      overlapStatus: bulkAnalysisDomains.overlapStatus,
      authorityDirect: bulkAnalysisDomains.authorityDirect,
      authorityRelated: bulkAnalysisDomains.authorityRelated,
      topicScope: bulkAnalysisDomains.topicScope,
      evidence: bulkAnalysisDomains.evidence,
      aiQualifiedAt: bulkAnalysisDomains.aiQualifiedAt
    })
    .from(bulkAnalysisDomains)
    .where(isNotNull(bulkAnalysisDomains.overlapStatus))
    .limit(5);

  console.log(`Found ${domainsWithV2.length} domains with V2 data:\n`);

  domainsWithV2.forEach(domain => {
    console.log(`Domain: ${domain.domain}`);
    console.log(`  Status: ${domain.qualificationStatus}`);
    console.log(`  Overlap: ${domain.overlapStatus}`);
    console.log(`  Authority Direct: ${domain.authorityDirect}`);
    console.log(`  Authority Related: ${domain.authorityRelated}`);
    console.log(`  Topic Scope: ${domain.topicScope}`);
    console.log(`  Evidence: ${JSON.stringify(domain.evidence)}`);
    console.log(`  AI Qualified At: ${domain.aiQualifiedAt}`);
    console.log('---');
  });

  // Get count of domains without V2 data but with qualification
  const domainsWithoutV2 = await db
    .select({
      count: bulkAnalysisDomains.id
    })
    .from(bulkAnalysisDomains)
    .where(isNotNull(bulkAnalysisDomains.aiQualifiedAt))
    .limit(1);

  console.log(`\nTotal AI qualified domains: ${domainsWithoutV2.length}`);

  process.exit(0);
}

checkV2Data().catch(console.error);