import { parseAirtableCSV, getAllEmailsFromRecord } from '../lib/utils/csvParser';
import fs from 'fs';

function validateExtraction() {
  console.log('🔍 VALIDATION: Testing CSV Extraction for Accuracy\n');
  
  const records = parseAirtableCSV();
  
  // Test specific known cases from the raw CSV we saw earlier
  const testCases = [
    {
      domain: 'h2horganizing.com',
      expectedEmails: ['ben@h2horganizing.com', 'florencedaigle2@gmail.com'],
      expectedPrices: [50, 90],
      expectedMainPrice: 90,
      rawLine: '"ben@h2horganizing.com, florencedaigle2@gmail.com","$50.00, $90.00"'
    },
    {
      domain: 'homeandjet.com',
      expectedEmails: ['sheharyarn4@gmail.com', 'kelly@homeandjet.com'],
      expectedPrices: [180],
      expectedMainPrice: 180,
      rawLine: '"sheharyarn4@gmail.com,kelly@homeandjet.com"'
    },
    {
      domain: 'cheapsurfgear.com',
      expectedEmails: ['info@cheapsnowgear.com', 'info@woodenearth.com'],
      expectedPrices: [100],
      expectedMainPrice: 100,
      rawLine: '"info@cheapsnowgear.com, info@woodenearth.com"'
    }
  ];
  
  console.log('📋 Test Case Validation:\n');
  let allPassed = true;
  
  testCases.forEach(test => {
    const record = records.find(r => r.domain === test.domain);
    if (!record) {
      console.log(`❌ ${test.domain}: NOT FOUND IN PARSED DATA`);
      allPassed = false;
      return;
    }
    
    const allEmails = getAllEmailsFromRecord(record);
    const emailsMatch = test.expectedEmails.every(email => 
      allEmails.includes(email.toLowerCase())
    );
    
    const pricesMatch = JSON.stringify(record.postflowGuestPostPrices.filter(p => p !== null)) === 
                        JSON.stringify(test.expectedPrices);
    const mainPriceMatch = record.guestPostCost === test.expectedMainPrice;
    
    if (emailsMatch && mainPriceMatch) {
      console.log(`✅ ${test.domain}: CORRECT`);
      console.log(`   Emails: ${allEmails.join(', ')}`);
      console.log(`   Prices: ${record.postflowGuestPostPrices.filter(p => p !== null).join(', ')}`);
      console.log(`   Main price: $${record.guestPostCost}`);
    } else {
      console.log(`❌ ${test.domain}: MISMATCH`);
      console.log(`   Expected emails: ${test.expectedEmails.join(', ')}`);
      console.log(`   Got emails: ${allEmails.join(', ')}`);
      console.log(`   Expected prices: ${test.expectedPrices.join(', ')}`);
      console.log(`   Got prices: ${record.postflowGuestPostPrices.filter(p => p !== null).join(', ')}`);
      console.log(`   Main price: $${record.guestPostCost} (expected: $${test.expectedMainPrice})`);
      allPassed = false;
    }
    console.log();
  });
  
  // Check for data integrity
  console.log('🔢 Data Integrity Checks:\n');
  
  // 1. Check that we're not losing records
  const totalRecords = records.length;
  console.log(`Total records parsed: ${totalRecords}`);
  
  // 2. Check for records with mismatched email/price counts
  const mismatched = records.filter(r => {
    const emails = r.postflowContactEmails.length;
    const prices = r.postflowGuestPostPrices.filter(p => p !== null && p > 0).length;
    return emails > 1 && prices > 1 && emails !== prices;
  });
  
  console.log(`Records with email/price count mismatch: ${mismatched.length}`);
  if (mismatched.length > 0) {
    console.log('Examples of mismatches:');
    mismatched.slice(0, 3).forEach(r => {
      console.log(`  ${r.domain}: ${r.postflowContactEmails.length} emails, ${r.postflowGuestPostPrices.filter(p => p !== null).length} prices`);
    });
  }
  
  // 3. Check for reasonable price ranges
  const unreasonablePrices = records.filter(r => {
    const hasUnreasonable = r.postflowGuestPostPrices.some(p => 
      p !== null && (p < 0 || p > 10000)
    );
    return hasUnreasonable || (r.guestPostCost !== null && (r.guestPostCost < 0 || r.guestPostCost > 10000));
  });
  
  console.log(`\nRecords with unreasonable prices (< $0 or > $10,000): ${unreasonablePrices.length}`);
  if (unreasonablePrices.length > 0) {
    unreasonablePrices.slice(0, 3).forEach(r => {
      console.log(`  ${r.domain}: main=$${r.guestPostCost}, others=[${r.postflowGuestPostPrices.join(', ')}]`);
    });
  }
  
  // 4. Check email validity
  const invalidEmails = [];
  records.forEach(record => {
    const allEmails = getAllEmailsFromRecord(record);
    allEmails.forEach(email => {
      if (!email.includes('@') || !email.includes('.')) {
        invalidEmails.push({ domain: record.domain, email });
      }
    });
  });
  
  console.log(`\nInvalid email addresses found: ${invalidEmails.length}`);
  if (invalidEmails.length > 0) {
    invalidEmails.slice(0, 5).forEach(item => {
      console.log(`  ${item.domain}: "${item.email}"`);
    });
  }
  
  // 5. Compare totals before/after
  console.log('\n📊 Before/After Comparison:');
  
  const uniqueEmailsBefore = new Set<string>();
  const uniqueEmailsAfter = new Set<string>();
  
  records.forEach(record => {
    // Before: only first email
    if (record.postflowContactEmails[0]) {
      uniqueEmailsBefore.add(record.postflowContactEmails[0].toLowerCase());
    } else if (record.guestPostContact) {
      const first = record.guestPostContact.split(',')[0].trim().toLowerCase();
      if (first) uniqueEmailsBefore.add(first);
    }
    
    // After: all emails
    getAllEmailsFromRecord(record).forEach(email => {
      uniqueEmailsAfter.add(email);
    });
  });
  
  console.log(`\nUnique emails BEFORE (first only): ${uniqueEmailsBefore.size}`);
  console.log(`Unique emails AFTER (all parsed): ${uniqueEmailsAfter.size}`);
  console.log(`Additional emails found: ${uniqueEmailsAfter.size - uniqueEmailsBefore.size}`);
  
  // 6. Sample of what we're adding
  const addedEmails = Array.from(uniqueEmailsAfter).filter(e => !uniqueEmailsBefore.has(e));
  console.log('\nSample of newly discovered emails:');
  addedEmails.slice(0, 10).forEach(email => {
    console.log(`  ${email}`);
  });
  
  // Final verdict
  console.log('\n' + '='.repeat(50));
  if (allPassed && invalidEmails.length === 0 && unreasonablePrices.length === 0) {
    console.log('✅ VALIDATION PASSED - Extraction looks correct!');
  } else {
    console.log('⚠️ VALIDATION ISSUES FOUND - Review above');
  }
  console.log('='.repeat(50));
}

validateExtraction();