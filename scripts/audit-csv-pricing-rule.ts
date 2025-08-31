import { parseAirtableCSV } from '../lib/utils/csvParser';

function auditCSVPricingRule() {
  console.log('🔍 Auditing CSV pricing rule for multiple values...\n');
  
  const records = parseAirtableCSV();
  
  let totalRecords = 0;
  let multipleValueRecords = 0;
  let rulePassed = 0;
  let ruleFailed = 0;
  let issues: any[] = [];
  
  for (const record of records) {
    totalRecords++;
    
    // Check if this record has multiple prices
    if (record.postflowGuestPostPrices.length > 1) {
      multipleValueRecords++;
      
      const mainPrice = record.guestPostCost;
      const individualPrices = record.postflowGuestPostPrices;
      const maxIndividualPrice = Math.max(...individualPrices);
      const minIndividualPrice = Math.min(...individualPrices);
      
      console.log(`📊 ${record.domain}:`);
      console.log(`   Main guest_post_cost: $${mainPrice}`);
      console.log(`   Individual prices: [${individualPrices.map(p => '$' + p).join(', ')}]`);
      console.log(`   Max individual: $${maxIndividualPrice}, Min: $${minIndividualPrice}`);
      
      if (mainPrice === maxIndividualPrice) {
        console.log(`   ✅ RULE PASSED: Main price matches highest individual price`);
        rulePassed++;
      } else if (mainPrice === minIndividualPrice) {
        console.log(`   ⚠️  RULE VARIANT: Main price matches lowest individual price`);
        issues.push({
          domain: record.domain,
          issue: 'uses_min_price',
          mainPrice,
          individualPrices,
          expectedPrice: maxIndividualPrice
        });
        ruleFailed++;
      } else if (individualPrices.includes(mainPrice)) {
        console.log(`   ⚠️  RULE VARIANT: Main price matches one of the individual prices (not max)`);
        issues.push({
          domain: record.domain,
          issue: 'uses_middle_price',
          mainPrice,
          individualPrices,
          expectedPrice: maxIndividualPrice
        });
        ruleFailed++;
      } else {
        console.log(`   ❌ RULE FAILED: Main price doesn't match any individual price`);
        issues.push({
          domain: record.domain,
          issue: 'no_match',
          mainPrice,
          individualPrices,
          expectedPrice: maxIndividualPrice
        });
        ruleFailed++;
      }
      console.log('');
    }
  }
  
  console.log('📈 AUDIT SUMMARY:');
  console.log(`   Total records: ${totalRecords}`);
  console.log(`   Records with multiple prices: ${multipleValueRecords}`);
  console.log(`   Rule passed (uses max price): ${rulePassed}`);
  console.log(`   Rule variants/failed: ${ruleFailed}`);
  console.log(`   Success rate: ${multipleValueRecords > 0 ? ((rulePassed / multipleValueRecords) * 100).toFixed(1) : 0}%`);
  
  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:');
    issues.forEach(issue => {
      console.log(`   ${issue.domain}: ${issue.issue} (main: $${issue.mainPrice}, expected: $${issue.expectedPrice})`);
    });
    
    console.log('\n🎯 RECOMMENDATION:');
    if (rulePassed > ruleFailed) {
      console.log('✅ The "use guest_post_cost as main price" approach should work fine.');
      console.log('   Most records follow a consistent rule. Minor exceptions exist but are manageable.');
    } else {
      console.log('❌ The CSV data is inconsistent. Manual review needed.');
      console.log('   Consider implementing fallback logic for edge cases.');
    }
  } else {
    console.log('\n✅ PERFECT CONSISTENCY: All multiple-price records follow the max price rule!');
  }
  
  process.exit(0);
}

auditCSVPricingRule();