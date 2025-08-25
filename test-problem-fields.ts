import { db } from './lib/db/connection';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';

async function testProblemFields() {
  try {
    console.log('Testing problematic fields individually...\n');
    
    const fieldsToTest = [
      { name: 'qualificationData', field: bulkAnalysisDomains.qualificationData },
      { name: 'targetPageIds', field: bulkAnalysisDomains.targetPageIds },
      { name: 'suggestedTargetUrl', field: bulkAnalysisDomains.suggestedTargetUrl },
      { name: 'targetMatchData', field: bulkAnalysisDomains.targetMatchData },
    ];

    for (const { name, field } of fieldsToTest) {
      try {
        console.log(`Testing field: ${name}`);
        console.log(`  Field value:`, field);
        console.log(`  Field is null?`, field === null);
        console.log(`  Field is undefined?`, field === undefined);
        
        if (field === undefined || field === null) {
          console.log(`  ❌ Field is ${field === null ? 'null' : 'undefined'}`);
          continue;
        }
        
        const result = await db
          .select({
            id: bulkAnalysisDomains.id,
            testField: field,
          })
          .from(bulkAnalysisDomains)
          .limit(1);
        console.log(`  ✅ Success - field works`);
      } catch (error: any) {
        console.log(`  ❌ FAILED: ${error.message}`);
      }
    }
    
  } catch (error: any) {
    console.error('Test error:', error.message);
  }
}

testProblemFields();