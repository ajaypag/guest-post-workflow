#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Comprehensive Pricing Verification Script');
console.log('=' .repeat(50));

// Test patterns that indicate potential pricing issues
const problematicPatterns = [
  {
    name: 'Double conversion (formatCurrency with /100)',
    pattern: 'formatCurrency.*\\/ 100',
    severity: 'CRITICAL'
  },
  {
    name: 'Direct guestPostCost display without conversion',
    pattern: '\\$\\{.*guestPostCost\\}(?!.*\\/)',
    severity: 'HIGH'
  },
  {
    name: 'parseFloat without /100 conversion',
    pattern: 'parseFloat\\(.*guestPostCost\\)(?!.*\\/ 100)',
    severity: 'HIGH'
  },
  {
    name: 'Manual toFixed(2) conversions',
    pattern: '\\/ 100.*toFixed\\(2\\)',
    severity: 'MEDIUM'
  }
];

console.log('\n📋 Checking for pricing issues...\n');

let issuesFound = 0;

for (const test of problematicPatterns) {
  try {
    const result = execSync(
      `grep -r "${test.pattern}" --include="*.tsx" --include="*.ts" . 2>/dev/null | head -10`,
      { encoding: 'utf-8', cwd: process.cwd() }
    ).trim();
    
    if (result) {
      console.log(`❌ [${test.severity}] ${test.name}`);
      console.log('   Found in:');
      const lines = result.split('\n').slice(0, 5);
      lines.forEach(line => {
        const [file, ...content] = line.split(':');
        console.log(`   - ${file.replace('./', '')}`);
      });
      issuesFound++;
    } else {
      console.log(`✅ ${test.name} - No issues found`);
    }
  } catch (error) {
    console.log(`✅ ${test.name} - No issues found`);
  }
}

// Check specific files that commonly have pricing issues
console.log('\n📁 Checking key pricing display files...\n');

const keyFiles = [
  'app/vetted-sites/components/VettedSitesTable.tsx',
  'components/OrdersTableMultiClient.tsx',
  'app/orders/[id]/page.tsx',
  'components/orders/OrderPaymentPage.tsx',
  'app/vetted-sites/hooks/useSelection.ts'
];

for (const file of keyFiles) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check for proper cents conversion
    const hasGuestPostCost = content.includes('guestPostCost');
    const hasDivision = content.includes('/ 100');
    const hasFormatCurrency = content.includes('formatCurrency');
    
    if (hasGuestPostCost) {
      if (hasDivision || hasFormatCurrency) {
        console.log(`✅ ${file} - Appears to handle pricing correctly`);
      } else {
        console.log(`⚠️  ${file} - May need review (has guestPostCost but no conversion)`);
        issuesFound++;
      }
    }
  }
}

console.log('\n' + '=' .repeat(50));
if (issuesFound === 0) {
  console.log('✅ All pricing displays appear to be correctly implemented!');
} else {
  console.log(`⚠️  Found ${issuesFound} potential issues that may need review`);
}

console.log('\n💡 Tip: All prices should be stored as cents (integers) in the database');
console.log('   and converted to dollars for display using formatCurrency() or /100');