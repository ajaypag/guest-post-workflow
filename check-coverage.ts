import { db } from './lib/db/connection';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { isNotNull, eq, and, or } from 'drizzle-orm';

async function checkTargetMatchCoverage() {
  // Get domains for the specific client
  const clientId = 'aca65919-c0f9-49d0-888b-2c488f7580dc';
  
  const allDomains = await db.select()
    .from(bulkAnalysisDomains)
    .where(and(
      eq(bulkAnalysisDomains.clientId, clientId),
      or(
        eq(bulkAnalysisDomains.qualificationStatus, 'high_quality'),
        eq(bulkAnalysisDomains.qualificationStatus, 'good_quality')
      )
    ))
    .limit(50);
    
  console.log('Total domains checked:', allDomains.length);
  
  const withTargetMatch = allDomains.filter(d => d.targetMatchData !== null);
  console.log('Domains WITH targetMatchData:', withTargetMatch.length);
  console.log('Domains WITHOUT targetMatchData:', allDomains.length - withTargetMatch.length);
  
  console.log('\nDomains with targetMatchData:');
  withTargetMatch.forEach(d => {
    const analysis = (d.targetMatchData as any)?.target_analysis || [];
    const allDirect = analysis.flatMap((a: any) => a.evidence?.direct_keywords || []);
    const allRelated = analysis.flatMap((a: any) => a.evidence?.related_keywords || []);
    console.log('  -', d.domain, '| Direct:', allDirect.length, '| Related:', allRelated.length);
  });
  
  console.log('\nFirst 10 domains WITHOUT targetMatchData:');
  allDomains.filter(d => !d.targetMatchData).slice(0, 10).forEach(d => {
    console.log('  -', d.domain);
  });
}

checkTargetMatchCoverage().catch(console.error);