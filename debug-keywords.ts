import { db } from './lib/db/connection';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { eq } from 'drizzle-orm';

async function debugKeywordData() {
  // Get a domain that definitely has keywords
  const domain = await db.select()
    .from(bulkAnalysisDomains)
    .where(eq(bulkAnalysisDomains.domain, 'employmentlawhandbook.com'))
    .limit(1)
    .then(rows => rows[0]);
    
  if (!domain) {
    console.log('Domain not found');
    return;
  }
  
  console.log('=== DOMAIN DATA STRUCTURE ===');
  console.log('Domain:', domain.domain);
  console.log('Has targetMatchData?', !!domain.targetMatchData);
  console.log('targetMatchData type:', typeof domain.targetMatchData);
  
  if (domain.targetMatchData) {
    console.log('\n=== TARGET MATCH DATA ===');
    console.log('Has target_analysis?', !!(domain.targetMatchData as any).target_analysis);
    
    const targetAnalysis = (domain.targetMatchData as any).target_analysis;
    if (targetAnalysis && Array.isArray(targetAnalysis)) {
      console.log('Number of analyses:', targetAnalysis.length);
      
      const firstAnalysis = targetAnalysis[0];
      if (firstAnalysis) {
        console.log('\n=== FIRST ANALYSIS ===');
        console.log('Has evidence?', !!firstAnalysis.evidence);
        console.log('Evidence keys:', firstAnalysis.evidence ? Object.keys(firstAnalysis.evidence) : 'N/A');
        
        if (firstAnalysis.evidence) {
          console.log('direct_keywords type:', typeof firstAnalysis.evidence.direct_keywords);
          console.log('direct_keywords is array?', Array.isArray(firstAnalysis.evidence.direct_keywords));
          console.log('direct_keywords length:', firstAnalysis.evidence.direct_keywords?.length || 0);
          console.log('Sample direct keywords:', firstAnalysis.evidence.direct_keywords?.slice(0, 2));
          
          console.log('\nrelated_keywords type:', typeof firstAnalysis.evidence.related_keywords);
          console.log('related_keywords is array?', Array.isArray(firstAnalysis.evidence.related_keywords));
          console.log('related_keywords length:', firstAnalysis.evidence.related_keywords?.length || 0);
          console.log('Sample related keywords:', firstAnalysis.evidence.related_keywords?.slice(0, 2));
        }
      }
    }
  }
  
  // Now check what's being passed to the frontend
  console.log('\n=== FRONTEND TRANSFORMATION ===');
  const transformedEvidence = domain.evidence ? {
    directCount: (domain.evidence as any)?.direct_count || 0,
    directMedianPosition: (domain.evidence as any)?.direct_median_position || null,
    relatedCount: (domain.evidence as any)?.related_count || 0,
    relatedMedianPosition: (domain.evidence as any)?.related_median_position || null,
  } : null;
  
  console.log('Transformed evidence:', transformedEvidence);
  
  // Check if targetPages exist
  console.log('\n=== TARGET PAGES ===');
  console.log('Has targetPageIds?', !!domain.targetPageIds);
  console.log('targetPageIds:', domain.targetPageIds);
}

debugKeywordData().catch(console.error);