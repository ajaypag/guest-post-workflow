import { db } from './lib/db/connection';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function migrateKeywordsToZaidClient() {
  // The client ID that zaid is using
  const zaidClientId = 'aca65919-c0f9-49d0-888b-2c488f7580dc';
  
  // The client ID that has targetMatchData
  const sourceClientId = '1b20b91e-3a06-477b-b0c8-baff0088da1a';
  
  // Find a domain with good keyword data from the source client
  const sourceDomain = await db.select()
    .from(bulkAnalysisDomains)
    .where(and(
      eq(bulkAnalysisDomains.clientId, sourceClientId),
      isNotNull(bulkAnalysisDomains.targetMatchData),
      eq(bulkAnalysisDomains.domain, 'employmentlawhandbook.com')
    ))
    .limit(1)
    .then(rows => rows[0]);
  
  if (!sourceDomain) {
    console.log('Source domain not found');
    return;
  }
  
  console.log('Found source domain:', sourceDomain.domain);
  console.log('Has targetMatchData:', !!sourceDomain.targetMatchData);
  
  // Check if the domain already exists for Zaid's client
  const existingDomain = await db.select()
    .from(bulkAnalysisDomains)
    .where(and(
      eq(bulkAnalysisDomains.clientId, zaidClientId),
      eq(bulkAnalysisDomains.domain, 'employmentlawhandbook.com')
    ))
    .limit(1)
    .then(rows => rows[0]);
  
  if (existingDomain) {
    console.log('Domain already exists for Zaid client, updating with targetMatchData...');
    
    // Update the existing domain with targetMatchData
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
        updatedAt: new Date()
      })
      .where(eq(bulkAnalysisDomains.id, existingDomain.id));
    
    console.log('Updated existing domain with targetMatchData');
  } else {
    console.log('Creating new domain entry for Zaid client...');
    
    // Create a new domain entry for Zaid's client
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
    
    console.log('Created new domain with targetMatchData');
  }
  
  // Verify the update
  const verifyDomain = await db.select()
    .from(bulkAnalysisDomains)
    .where(and(
      eq(bulkAnalysisDomains.clientId, zaidClientId),
      eq(bulkAnalysisDomains.domain, 'employmentlawhandbook.com')
    ))
    .limit(1)
    .then(rows => rows[0]);
  
  if (verifyDomain && verifyDomain.targetMatchData) {
    const data = verifyDomain.targetMatchData as any;
    if (data.target_analysis && Array.isArray(data.target_analysis)) {
      const allDirect = data.target_analysis.flatMap((a: any) => a.evidence?.direct_keywords || []);
      const allRelated = data.target_analysis.flatMap((a: any) => a.evidence?.related_keywords || []);
      
      console.log('\n✅ VERIFICATION SUCCESS:');
      console.log('Domain has targetMatchData with:');
      console.log('  Direct keywords:', allDirect.length);
      console.log('  Related keywords:', allRelated.length);
    }
  } else {
    console.log('\n❌ VERIFICATION FAILED: No targetMatchData found after update');
  }
}

migrateKeywordsToZaidClient().catch(console.error);