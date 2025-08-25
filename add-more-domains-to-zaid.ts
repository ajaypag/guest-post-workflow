import { db } from './lib/db/connection';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';

async function addMoreDomainsToZaid() {
  // The client ID that zaid is using
  const zaidClientId = 'aca65919-c0f9-49d0-888b-2c488f7580dc';
  
  // The client ID that has targetMatchData
  const sourceClientId = '1b20b91e-3a06-477b-b0c8-baff0088da1a';
  
  // Domains to migrate
  const domainsToMigrate = ['thefrugalexpat.com', 'manvsdebt.com', 'impactwealth.org'];
  
  // Find source domains with keyword data
  const sourceDomains = await db.select()
    .from(bulkAnalysisDomains)
    .where(and(
      eq(bulkAnalysisDomains.clientId, sourceClientId),
      isNotNull(bulkAnalysisDomains.targetMatchData),
      inArray(bulkAnalysisDomains.domain, domainsToMigrate)
    ));
  
  console.log(`Found ${sourceDomains.length} source domains to migrate`);
  
  for (const sourceDomain of sourceDomains) {
    console.log(`\nProcessing: ${sourceDomain.domain}`);
    
    // Check if already exists for Zaid
    const existingDomain = await db.select()
      .from(bulkAnalysisDomains)
      .where(and(
        eq(bulkAnalysisDomains.clientId, zaidClientId),
        eq(bulkAnalysisDomains.domain, sourceDomain.domain)
      ))
      .limit(1)
      .then(rows => rows[0]);
    
    if (existingDomain) {
      console.log(`  Updating existing domain...`);
      
      await db.update(bulkAnalysisDomains)
        .set({
          targetMatchData: sourceDomain.targetMatchData,
          evidence: sourceDomain.evidence,
          qualificationStatus: sourceDomain.qualificationStatus,
          aiQualificationReasoning: sourceDomain.aiQualificationReasoning,
          topicScope: sourceDomain.topicScope,
          topicReasoning: sourceDomain.topicReasoning,
          overlapStatus: sourceDomain.overlapStatus,
          authorityDirect: sourceDomain.authorityDirect,
          authorityRelated: sourceDomain.authorityRelated,
          suggestedTargetUrl: sourceDomain.suggestedTargetUrl,
          updatedAt: new Date()
        })
        .where(eq(bulkAnalysisDomains.id, existingDomain.id));
      
      console.log(`  ✅ Updated`);
    } else {
      console.log(`  Creating new domain entry...`);
      
      await db.insert(bulkAnalysisDomains).values({
        clientId: zaidClientId,
        domain: sourceDomain.domain,
        targetMatchData: sourceDomain.targetMatchData,
        evidence: sourceDomain.evidence,
        qualificationStatus: sourceDomain.qualificationStatus || 'qualified',
        aiQualificationReasoning: sourceDomain.aiQualificationReasoning,
        topicScope: sourceDomain.topicScope,
        topicReasoning: sourceDomain.topicReasoning,
        overlapStatus: sourceDomain.overlapStatus,
        authorityDirect: sourceDomain.authorityDirect,
        authorityRelated: sourceDomain.authorityRelated,
        suggestedTargetUrl: sourceDomain.suggestedTargetUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`  ✅ Created`);
    }
    
    // Show keyword counts
    const data = sourceDomain.targetMatchData as any;
    if (data?.target_analysis && Array.isArray(data.target_analysis)) {
      const allDirect = data.target_analysis.flatMap((a: any) => a.evidence?.direct_keywords || []);
      const allRelated = data.target_analysis.flatMap((a: any) => a.evidence?.related_keywords || []);
      console.log(`  Keywords: ${allDirect.length} direct, ${allRelated.length} related`);
    }
  }
  
  // Final verification
  const zaidDomains = await db.select()
    .from(bulkAnalysisDomains)
    .where(and(
      eq(bulkAnalysisDomains.clientId, zaidClientId),
      isNotNull(bulkAnalysisDomains.targetMatchData)
    ));
  
  console.log(`\n✅ COMPLETE: Zaid's client now has ${zaidDomains.length} domains with targetMatchData`);
}

addMoreDomainsToZaid().catch(console.error);