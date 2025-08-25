import { db } from './lib/db/connection';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { isNotNull } from 'drizzle-orm';

async function checkAllDomains() {
  // Get any domains with targetMatchData
  const domains = await db.select()
    .from(bulkAnalysisDomains)
    .where(isNotNull(bulkAnalysisDomains.targetMatchData))
    .limit(5);
  
  console.log('Total domains with targetMatchData:', domains.length);
  
  for (const domain of domains) {
    console.log('\n=== Domain:', domain.domain, '===');
    console.log('Client ID:', domain.clientId);
    
    const data = domain.targetMatchData as any;
    
    if (data?.target_analysis && Array.isArray(data.target_analysis)) {
      const allDirect = data.target_analysis.flatMap((a: any) => a.evidence?.direct_keywords || []);
      const allRelated = data.target_analysis.flatMap((a: any) => a.evidence?.related_keywords || []);
      
      console.log('Direct keywords count:', allDirect.length);
      if (allDirect.length > 0) {
        console.log('Direct keywords:', allDirect.slice(0, 5));
      }
      console.log('Related keywords count:', allRelated.length);
      if (allRelated.length > 0) {
        console.log('Related keywords:', allRelated.slice(0, 5));
      }
    }
  }
  
  // Also check which client has data
  const clientsWithData = await db.selectDistinct({ clientId: bulkAnalysisDomains.clientId })
    .from(bulkAnalysisDomains)
    .where(isNotNull(bulkAnalysisDomains.targetMatchData));
  
  console.log('\n\nClient IDs with targetMatchData:', clientsWithData.map(c => c.clientId));
}

checkAllDomains().catch(console.error);