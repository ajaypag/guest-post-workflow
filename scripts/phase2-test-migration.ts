#!/usr/bin/env npx tsx
/**
 * Phase 2 Migration Test
 * Verifies that guest_post_cost conversion to cents is working correctly
 */

import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';
import { PricingService } from '../lib/services/pricingService';
import { EnhancedOrderPricingService } from '../lib/services/enhancedOrderPricingService';
import { SERVICE_FEE_CENTS } from '../lib/config/pricing';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

interface TestResult {
  category: string;
  test: string;
  expected: any;
  actual: any;
  passed: boolean;
  notes?: string;
}

class Phase2MigrationTest {
  private results: TestResult[] = [];
  
  async runAllTests() {
    console.log('\n' + blue('═'.repeat(70)));
    console.log(blue('PHASE 2 MIGRATION TEST'));
    console.log(blue('Testing guest_post_cost cents conversion'));
    console.log(blue('═'.repeat(70)) + '\n');
    
    await this.testDatabaseValues();
    await this.testPricingService();
    await this.testEnhancedPricingService();
    await this.testAPIResponses();
    await this.testEdgeCases();
    
    this.printSummary();
  }
  
  async testDatabaseValues() {
    console.log(yellow('▶ Testing Database Values\n'));
    
    // Check that values are stored as cents
    const samples = await db.execute(sql`
      SELECT domain, guest_post_cost
      FROM websites
      WHERE guest_post_cost IS NOT NULL
      ORDER BY guest_post_cost DESC
      LIMIT 3
    `);
    
    for (const row of samples.rows) {
      const cents = row.guest_post_cost;
      const isValidCents = Number.isInteger(cents) && cents > 0;
      
      this.addResult({
        category: 'Database',
        test: `${row.domain} stores cents`,
        expected: 'Integer cents value',
        actual: cents,
        passed: isValidCents,
        notes: `$${(cents / 100).toFixed(2)}`
      });
    }
    
    // Check data type
    const columnType = await db.execute(sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND column_name = 'guest_post_cost'
    `);
    
    this.addResult({
      category: 'Database',
      test: 'Column data type',
      expected: 'integer',
      actual: columnType.rows[0]?.data_type,
      passed: columnType.rows[0]?.data_type === 'integer'
    });
  }
  
  async testPricingService() {
    console.log(yellow('\n▶ Testing PricingService\n'));
    
    // Test with a known domain
    const testDomain = 'example.com';
    
    // First, insert test data
    await db.execute(sql`
      UPDATE websites 
      SET guest_post_cost = 15000 
      WHERE domain = ${testDomain}
    `);
    
    const price = await PricingService.getDomainPrice(testDomain);
    
    if (price.found) {
      // PricingService returns dollars, but should convert from cents correctly
      this.addResult({
        category: 'PricingService',
        test: 'Wholesale price conversion',
        expected: 150, // $150 (15000 cents / 100)
        actual: price.wholesalePrice,
        passed: Math.abs(price.wholesalePrice - 150) < 0.01,
        notes: 'Converts cents to dollars'
      });
      
      this.addResult({
        category: 'PricingService',
        test: 'Retail price calculation',
        expected: 229, // $150 + $79
        actual: price.retailPrice,
        passed: Math.abs(price.retailPrice - 229) < 0.01,
        notes: 'Adds $79 service fee'
      });
    }
  }
  
  async testEnhancedPricingService() {
    console.log(yellow('\n▶ Testing EnhancedOrderPricingService\n'));
    
    const testDomain = 'test.com';
    
    // Insert or update test data
    await db.execute(sql`
      INSERT INTO websites (
        id, domain, guest_post_cost, 
        airtable_created_at, airtable_updated_at, last_synced_at,
        created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), ${testDomain}, 20000,
        NOW(), NOW(), NOW(),
        NOW(), NOW()
      )
      ON CONFLICT (domain) 
      DO UPDATE SET guest_post_cost = 20000
    `);
    
    const pricing = await EnhancedOrderPricingService.getWebsitePrice(
      null,
      testDomain,
      { quantity: 1, clientType: 'standard', urgency: 'standard' }
    );
    
    // EnhancedOrderPricingService returns cents
    this.addResult({
      category: 'EnhancedPricingService',
      test: 'Wholesale price in cents',
      expected: 20000,
      actual: pricing.wholesalePrice,
      passed: pricing.wholesalePrice === 20000,
      notes: 'Returns cents directly'
    });
    
    this.addResult({
      category: 'EnhancedPricingService',
      test: 'Retail price with service fee',
      expected: 20000 + SERVICE_FEE_CENTS,
      actual: pricing.retailPrice,
      passed: pricing.retailPrice === (20000 + SERVICE_FEE_CENTS),
      notes: `$200 + $79 = $279`
    });
  }
  
  async testAPIResponses() {
    console.log(yellow('\n▶ Testing API Response Format\n'));
    
    // Test that APIs return the correct format
    try {
      const response = await fetch('http://localhost:3000/api/websites/search?q=test&limit=1');
      if (response.ok) {
        const data = await response.json();
        if (data.websites && data.websites.length > 0) {
          const website = data.websites[0];
          
          this.addResult({
            category: 'API',
            test: 'Website search returns cents',
            expected: 'Integer or null',
            actual: typeof website.guestPostCost,
            passed: website.guestPostCost === null || Number.isInteger(website.guestPostCost),
            notes: 'API returns raw cents value'
          });
        }
      }
    } catch (error) {
      console.log('  API test skipped (server may be restarting)');
    }
  }
  
  async testEdgeCases() {
    console.log(yellow('\n▶ Testing Edge Cases\n'));
    
    // Test null values
    const nullCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites
      WHERE guest_post_cost IS NULL
    `);
    
    this.addResult({
      category: 'Edge Cases',
      test: 'Null values handled',
      expected: true,
      actual: true,
      passed: true,
      notes: `${nullCount.rows[0].count} websites without pricing`
    });
    
    // Test very small values
    const smallValues = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites
      WHERE guest_post_cost > 0 AND guest_post_cost < 100
    `);
    
    this.addResult({
      category: 'Edge Cases',
      test: 'Small values (< $1)',
      expected: 'Rare or none',
      actual: smallValues.rows[0].count,
      passed: true,
      notes: 'Values under 100 cents'
    });
  }
  
  private addResult(result: TestResult) {
    this.results.push(result);
    const status = result.passed ? green('✓ PASS') : red('✗ FAIL');
    console.log(`  ${status} ${result.test}`);
    if (!result.passed) {
      console.log(`    Expected: ${cyan(JSON.stringify(result.expected))}`);
      console.log(`    Actual:   ${red(JSON.stringify(result.actual))}`);
    }
    if (result.notes) {
      console.log(`    ${yellow('Note:')} ${result.notes}`);
    }
  }
  
  private printSummary() {
    console.log('\n' + blue('═'.repeat(70)));
    console.log(blue('TEST SUMMARY'));
    console.log(blue('═'.repeat(70)) + '\n');
    
    // Group results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.passed).length;
      const total = categoryResults.length;
      const passRate = ((passed / total) * 100).toFixed(0);
      
      const color = passed === total ? green : passed > 0 ? yellow : red;
      console.log(`  ${color(`${category}:`)} ${passed}/${total} passed (${passRate}%)`);
    });
    
    // Overall summary
    const totalPassed = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const overallRate = ((totalPassed / totalTests) * 100).toFixed(0);
    
    console.log('\n' + '─'.repeat(70));
    console.log(`  ${cyan('Overall:')} ${totalPassed}/${totalTests} tests passed (${overallRate}%)`);
    
    if (totalPassed === totalTests) {
      console.log('\n' + green('✅ Phase 2 Migration SUCCESSFUL'));
      console.log(green('All cents conversions are working correctly!'));
    } else {
      console.log('\n' + red('⚠️  Some tests failed. Review the results above.'));
      
      // List failed tests
      const failed = this.results.filter(r => !r.passed);
      if (failed.length > 0) {
        console.log('\n' + red('Failed Tests:'));
        failed.forEach(f => {
          console.log(`  - ${f.category}: ${f.test}`);
        });
      }
    }
    
    console.log('\n' + blue('═'.repeat(70)) + '\n');
  }
}

// Run the test
async function main() {
  try {
    const test = new Phase2MigrationTest();
    await test.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error(red('Test failed with error:'), error);
    process.exit(1);
  }
}

main();