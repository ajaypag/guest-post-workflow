#!/usr/bin/env npx tsx
/**
 * Verify Phase 2 Pricing Fixes
 * Quick test to verify our pricing display fixes are working
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { websites } from '../lib/db/websiteSchema';
import { eq, isNotNull } from 'drizzle-orm';
import { formatCurrency } from '../lib/utils/formatting';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

async function main() {
  console.log('\n' + blue('═'.repeat(70)));
  console.log(blue('PHASE 2 PRICING FIXES VERIFICATION'));
  console.log(blue('Testing database values and display formatting'));
  console.log(blue('═'.repeat(70)) + '\n');
  
  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool);
  
  try {
    // Test database values
    console.log(yellow('▶ Testing Database Values\n'));
    
    const websitesSample = await db
      .select()
      .from(websites)
      .where(isNotNull(websites.guestPostCost))
      .limit(10);
    
    console.log(`  📊 Found ${websitesSample.length} websites with pricing:`);
    
    websitesSample.forEach((site, i) => {
      const domain = site.domain;
      const costCents = site.guestPostCost;
      const costDollars = costCents ? costCents / 100 : 0;
      
      console.log(`    ${i + 1}. ${domain}`);
      console.log(`       Database value: ${costCents} cents`);
      console.log(`       Manual conversion: $${costDollars.toFixed(2)}`);
      console.log(`       formatCurrency(): ${formatCurrency(costCents!)}`);
      
      // Verify the conversion looks reasonable
      if (costCents && costCents > 10000) { // More than $100
        console.log(green(`       ✅ Reasonable pricing (${formatCurrency(costCents)})`));
      } else if (costCents && costCents < 1000) { // Less than $10
        console.log(red(`       ❌ Suspiciously low pricing (${formatCurrency(costCents)})`));
      } else {
        console.log(yellow(`       ⚠️  Moderate pricing (${formatCurrency(costCents)})`));
      }
    });
    
    // Test the formatting function directly
    console.log(yellow('\n▶ Testing Format Function\n'));
    
    const testValues = [500, 1500, 5000, 15000, 50000, 150000]; // Various cent values
    testValues.forEach(cents => {
      console.log(`  ${cents} cents → ${formatCurrency(cents)}`);
    });
    
    // Test display patterns 
    console.log(yellow('\n▶ Component Display Patterns\n'));
    
    const sampleSite = websitesSample[0];
    if (sampleSite?.guestPostCost) {
      const cost = sampleSite.guestPostCost;
      
      console.log('  Component display patterns for sample site:');
      console.log(`    Manual pattern: $${(cost / 100).toFixed(2)}`);
      console.log(`    formatCurrency pattern: ${formatCurrency(cost)}`);
      console.log(`    ❌ WRONG - Double conversion: ${formatCurrency(cost / 100)}`);
      console.log(`    ❌ WRONG - Raw cents as dollars: $${cost}`);
    }
    
  } catch (error) {
    console.error(red('Test failed:'), error.message);
  } finally {
    await pool.end();
  }
  
  console.log('\n' + blue('═'.repeat(70)));
  console.log(blue('VERIFICATION COMPLETE'));
  console.log(blue('All UI components should use either:'));
  console.log(cyan('  1. formatCurrency(website.guestPostCost) - preferred'));
  console.log(cyan('  2. ${(website.guestPostCost / 100).toFixed(2)} - manual'));
  console.log(red('Never use: formatCurrency(website.guestPostCost / 100)'));
  console.log(blue('═'.repeat(70)) + '\n');
}

main().catch(console.error);