import { parseAirtableCSV, getAllEmailsFromRecord } from '../lib/utils/csvParser';

const records = parseAirtableCSV();

console.log('🔍 Finding sites with MORE emails than prices\n');
console.log('=' .repeat(60) + '\n');

const mismatches = [];

records.forEach(record => {
  const emailCount = record.postflowContactEmails.length;
  const priceCount = record.postflowGuestPostPrices.filter(p => p !== null && p > 0).length;
  
  if (emailCount > priceCount && emailCount > 1) {
    mismatches.push({
      domain: record.domain,
      emailCount,
      priceCount,
      emails: record.postflowContactEmails,
      prices: record.postflowGuestPostPrices,
      guestPostCost: record.guestPostCost,
      guestPostContact: record.guestPostContact
    });
  }
});

console.log(`Found ${mismatches.length} sites with more emails than prices\n`);

// Show detailed examples
const examples = mismatches.slice(0, 5);

examples.forEach((site, idx) => {
  console.log(`Example ${idx + 1}: ${site.domain}`);
  console.log('-'.repeat(40));
  console.log(`📧 Emails (${site.emailCount}):`);
  site.emails.forEach((email, i) => {
    console.log(`   ${i + 1}. ${email}`);
  });
  
  console.log(`\n💰 Prices (${site.priceCount}):`);
  site.prices.forEach((price, i) => {
    if (price !== null && price > 0) {
      console.log(`   ${i + 1}. $${price}`);
    }
  });
  
  console.log(`\n📊 Main guest_post_cost: $${site.guestPostCost}`);
  
  console.log('\n🚫 CONSERVATIVE APPROACH:');
  site.emails.forEach((email, i) => {
    const price = site.prices[i];
    if (price && price > 0) {
      console.log(`   ✅ CREATE: ${email} → $${price}`);
    } else {
      console.log(`   ❌ SKIP: ${email} → No price at index ${i}`);
    }
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
});

// Summary statistics
const totalEmailsInMismatches = mismatches.reduce((sum, s) => sum + s.emailCount, 0);
const totalPricesInMismatches = mismatches.reduce((sum, s) => sum + s.priceCount, 0);
const skippedContacts = totalEmailsInMismatches - totalPricesInMismatches;

console.log('📊 SUMMARY:');
console.log(`   Sites with more emails than prices: ${mismatches.length}`);
console.log(`   Total emails in these sites: ${totalEmailsInMismatches}`);
console.log(`   Total prices available: ${totalPricesInMismatches}`);
console.log(`   Contacts that will be SKIPPED: ${skippedContacts}`);
console.log('\n⚠️  These ${skippedContacts} contacts will NOT have publishers created');
console.log('   because we don\'t have explicit pricing for them.');