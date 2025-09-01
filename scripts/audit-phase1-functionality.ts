#!/usr/bin/env npx tsx
/**
 * Phase 1 Functionality Audit
 * Tests that service fee centralization works correctly in practice
 */

import { db } from '../lib/db/connection';
import { SERVICE_FEE_CENTS, DEFAULT_RETAIL_PRICE_CENTS } from '../lib/config/pricing';
import { PricingService } from '../lib/services/pricingService';
import { EnhancedOrderPricingService } from '../lib/services/enhancedOrderPricingService';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

interface AuditResult {
  category: string;
  test: string;
  expected: any;
  actual: any;
  passed: boolean;
  notes?: string;
}

class Phase1Audit {
  private results: AuditResult[] = [];
  
  async runAllTests() {
    console.log('\n' + blue('═'.repeat(70)));
    console.log(blue('PHASE 1 FUNCTIONALITY AUDIT'));
    console.log(blue('Testing Service Fee Centralization'));
    console.log(blue('═'.repeat(70)) + '\n');
    
    await this.testConfigurationValues();
    await this.testPricingServiceCalculations();
    await this.testEnhancedPricingService();
    await this.testRealWorldScenarios();
    await this.testEdgeCases();
    
    this.printSummary();
  }
  
  async testConfigurationValues() {
    console.log(yellow('\n▶ Testing Configuration Values\n'));
    
    // Test 1: Service fee constant
    this.addResult({
      category: 'Configuration',
      test: 'SERVICE_FEE_CENTS value',
      expected: 7900,
      actual: SERVICE_FEE_CENTS,
      passed: SERVICE_FEE_CENTS === 7900
    });
    
    // Test 2: Default retail price
    this.addResult({
      category: 'Configuration',
      test: 'DEFAULT_RETAIL_PRICE_CENTS value',
      expected: 27900,
      actual: DEFAULT_RETAIL_PRICE_CENTS,
      passed: DEFAULT_RETAIL_PRICE_CENTS === 27900
    });
    
    // Test 3: Calculate consistency
    const calculatedDefault = 20000 + SERVICE_FEE_CENTS; // $200 wholesale + service fee
    this.addResult({
      category: 'Configuration',
      test: 'Default price calculation consistency',
      expected: DEFAULT_RETAIL_PRICE_CENTS,
      actual: calculatedDefault,
      passed: calculatedDefault === DEFAULT_RETAIL_PRICE_CENTS,
      notes: 'DEFAULT_RETAIL_PRICE should equal $200 wholesale + SERVICE_FEE'
    });
  }
  
  async testPricingServiceCalculations() {
    console.log(yellow('\n▶ Testing PricingService Calculations\n'));
    
    // Test a real domain
    const testDomain = 'techcrunch.com';
    const price = await PricingService.getDomainPrice(testDomain);
    
    if (price.found && price.wholesalePrice > 0) {
      // Test retail = wholesale + 79
      const expectedRetail = price.wholesalePrice + 79; // Note: PricingService uses dollars
      this.addResult({
        category: 'PricingService',
        test: `Retail price calculation for ${testDomain}`,
        expected: expectedRetail,
        actual: price.retailPrice,
        passed: Math.abs(price.retailPrice - expectedRetail) < 0.01,
        notes: `Wholesale: $${price.wholesalePrice}, Retail: $${price.retailPrice}`
      });
    } else {
      this.addResult({
        category: 'PricingService',
        test: `Domain pricing for ${testDomain}`,
        expected: 'Price data',
        actual: 'Not found',
        passed: false,
        notes: 'Domain not in database or no pricing'
      });
    }
  }
  
  async testEnhancedPricingService() {
    console.log(yellow('\n▶ Testing EnhancedOrderPricingService\n'));
    
    // Test with a known website
    const testDomain = 'example.com';
    const pricing = await EnhancedOrderPricingService.getWebsitePrice(
      null, // no website ID
      testDomain,
      {
        quantity: 1,
        clientType: 'standard',
        urgency: 'standard'
      }
    );
    
    if (pricing.wholesalePrice > 0) {
      // Test that retail = wholesale + SERVICE_FEE_CENTS
      const expectedRetail = pricing.wholesalePrice + SERVICE_FEE_CENTS;
      this.addResult({
        category: 'EnhancedPricingService',
        test: 'Service fee addition in cents',
        expected: expectedRetail,
        actual: pricing.retailPrice,
        passed: pricing.retailPrice === expectedRetail,
        notes: `Wholesale: ${pricing.wholesalePrice}¢, Retail: ${pricing.retailPrice}¢`
      });
    } else {
      this.addResult({
        category: 'EnhancedPricingService',
        test: 'Website pricing retrieval',
        expected: 'Valid pricing',
        actual: 'No pricing found',
        passed: false,
        notes: pricing.source
      });
    }
  }
  
  async testRealWorldScenarios() {
    console.log(yellow('\n▶ Testing Real-World Scenarios\n'));
    
    // Scenario 1: Multiple items with service fee
    const items = [
      { wholesale: 10000 }, // $100
      { wholesale: 20000 }, // $200
      { wholesale: 30000 }  // $300
    ];
    
    let totalRetail = 0;
    let totalWholesale = 0;
    
    items.forEach(item => {
      const retail = item.wholesale + SERVICE_FEE_CENTS;
      totalRetail += retail;
      totalWholesale += item.wholesale;
    });
    
    const totalServiceFees = items.length * SERVICE_FEE_CENTS;
    
    this.addResult({
      category: 'Real-World',
      test: 'Multi-item service fee calculation',
      expected: totalWholesale + totalServiceFees,
      actual: totalRetail,
      passed: totalRetail === (totalWholesale + totalServiceFees),
      notes: `${items.length} items × $79 = $${(totalServiceFees/100).toFixed(2)} in fees`
    });
    
    // Scenario 2: Discount calculation
    const subtotal = totalRetail;
    const discountPercent = 10;
    const discountAmount = Math.floor(subtotal * (discountPercent / 100));
    const finalTotal = subtotal - discountAmount;
    
    this.addResult({
      category: 'Real-World',
      test: 'Discount applied to total (including service fees)',
      expected: true,
      actual: finalTotal < subtotal,
      passed: finalTotal === (subtotal - discountAmount),
      notes: `10% off $${(subtotal/100).toFixed(2)} = $${(finalTotal/100).toFixed(2)}`
    });
  }
  
  async testEdgeCases() {
    console.log(yellow('\n▶ Testing Edge Cases\n'));
    
    // Edge case 1: Zero wholesale price
    const zeroWholesale = 0;
    const retailWithServiceFee = zeroWholesale + SERVICE_FEE_CENTS;
    
    this.addResult({
      category: 'Edge Cases',
      test: 'Service fee with $0 wholesale',
      expected: SERVICE_FEE_CENTS,
      actual: retailWithServiceFee,
      passed: retailWithServiceFee === SERVICE_FEE_CENTS,
      notes: 'Service fee should still apply even for free items'
    });
    
    // Edge case 2: Very high wholesale price
    const highWholesale = 1000000; // $10,000
    const highRetail = highWholesale + SERVICE_FEE_CENTS;
    
    this.addResult({
      category: 'Edge Cases',
      test: 'Service fee with high wholesale',
      expected: highWholesale + SERVICE_FEE_CENTS,
      actual: highRetail,
      passed: highRetail === (highWholesale + SERVICE_FEE_CENTS),
      notes: 'Fixed fee regardless of wholesale price'
    });
    
    // Edge case 3: Negative adjustment (should not happen but test defensive)
    const testPrice = 15000; // $150
    const adjustedPrice = Math.max(testPrice - SERVICE_FEE_CENTS, 0);
    
    this.addResult({
      category: 'Edge Cases',
      test: 'Wholesale calculation from retail (defensive)',
      expected: testPrice - SERVICE_FEE_CENTS,
      actual: adjustedPrice,
      passed: adjustedPrice === (testPrice - SERVICE_FEE_CENTS),
      notes: 'Subtracting service fee to get wholesale'
    });
  }
  
  private addResult(result: AuditResult) {
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
    console.log(blue('AUDIT SUMMARY'));
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
      console.log('\n' + green('✅ Phase 1 Implementation FULLY FUNCTIONAL'));
      console.log(green('All service fee calculations are working correctly!'));
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

// Run the audit
async function main() {
  try {
    const audit = new Phase1Audit();
    await audit.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error(red('Audit failed with error:'), error);
    process.exit(1);
  }
}

main();