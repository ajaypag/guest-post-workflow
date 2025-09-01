#!/usr/bin/env npx tsx
/**
 * Phase 2 Migration Script
 * Converts guest_post_cost from DECIMAL (dollars) to INTEGER (cents)
 */

import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

async function runMigration() {
  console.log('\n' + blue('═'.repeat(70)));
  console.log(blue('PHASE 2 MIGRATION: DOLLARS TO CENTS'));
  console.log(blue('═'.repeat(70)) + '\n');

  try {
    // Step 1: Backup current values
    console.log(yellow('▶ Step 1: Creating backup of current values\n'));
    
    const backup = await db.execute(sql`
      SELECT id, domain, guest_post_cost 
      FROM websites 
      WHERE guest_post_cost IS NOT NULL
      ORDER BY domain
    `);
    
    // Save backup to file
    const backupPath = path.join(process.cwd(), 'scripts', 'phase2-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backup.rows, null, 2));
    console.log(`  ✅ Backup saved to: ${cyan(backupPath)}`);
    console.log(`  ✅ ${backup.rows.length} records backed up`);

    // Step 2: Run database migration
    console.log(yellow('\n▶ Step 2: Converting database column to INTEGER (cents)\n'));
    
    // First, let's verify the conversion will work
    const testConversion = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ROUND(guest_post_cost * 100) > 2147483647 THEN 1 END) as overflow_risk
      FROM websites
      WHERE guest_post_cost IS NOT NULL
    `);
    
    if (testConversion.rows[0].overflow_risk > 0) {
      console.error(red('  ❌ Some values would overflow INTEGER type!'));
      process.exit(1);
    }
    
    console.log('  Converting column type...');
    await db.execute(sql`
      ALTER TABLE websites 
      ALTER COLUMN guest_post_cost TYPE INTEGER 
      USING (ROUND(guest_post_cost * 100)::INTEGER)
    `);
    console.log(green('  ✅ Column converted to INTEGER (cents)'));

    // Step 3: Verify conversion
    console.log(yellow('\n▶ Step 3: Verifying conversion\n'));
    
    const verification = await db.execute(sql`
      SELECT 
        id,
        domain,
        guest_post_cost as cents
      FROM websites 
      WHERE guest_post_cost IS NOT NULL
      ORDER BY guest_post_cost DESC
      LIMIT 5
    `);
    
    console.log('  Top 5 prices after conversion:');
    verification.rows.forEach((row: any) => {
      const cents = row.cents;
      const dollars = cents / 100;
      console.log(`    ${row.domain}: ${cents} cents ($${dollars.toFixed(2)})`);
    });

    // Step 4: Check data integrity
    console.log(yellow('\n▶ Step 4: Data Integrity Check\n'));
    
    const integrityCheck = await db.execute(sql`
      SELECT 
        COUNT(*) as total_with_price,
        MIN(guest_post_cost) as min_cents,
        MAX(guest_post_cost) as max_cents,
        AVG(guest_post_cost)::INTEGER as avg_cents
      FROM websites
      WHERE guest_post_cost IS NOT NULL
    `);
    
    const stats = integrityCheck.rows[0];
    console.log(`  Records with pricing: ${green(stats.total_with_price)}`);
    console.log(`  Min price: ${stats.min_cents} cents ($${(stats.min_cents/100).toFixed(2)})`);
    console.log(`  Max price: ${stats.max_cents} cents ($${(stats.max_cents/100).toFixed(2)})`);
    console.log(`  Avg price: ${stats.avg_cents} cents ($${(stats.avg_cents/100).toFixed(2)})`);

    // Success!
    console.log('\n' + blue('═'.repeat(70)));
    console.log(green('✅ DATABASE MIGRATION COMPLETE'));
    console.log(blue('═'.repeat(70)) + '\n');
    
    console.log(cyan('Next Steps:'));
    console.log('  1. Update schema file: lib/db/websiteSchema.ts');
    console.log('  2. Run: npm run phase2:update-files');
    console.log('  3. Test with: npm run phase2:test');
    
    console.log('\n' + yellow('Rollback Command (if needed):'));
    console.log('  ALTER TABLE websites ALTER COLUMN guest_post_cost TYPE DECIMAL(10,2) USING (guest_post_cost::DECIMAL / 100)');
    
    console.log('\n' + blue('═'.repeat(70)) + '\n');

  } catch (error) {
    console.error(red('\n❌ Migration failed:'), error);
    console.log(yellow('\nRolling back...'));
    
    try {
      // Attempt rollback
      await db.execute(sql`
        ALTER TABLE websites 
        ALTER COLUMN guest_post_cost TYPE DECIMAL(10,2) 
        USING (guest_post_cost::DECIMAL / 100)
      `);
      console.log(green('✅ Rollback successful'));
    } catch (rollbackError) {
      console.error(red('❌ Rollback failed:'), rollbackError);
      console.log(red('Manual intervention required!'));
    }
    
    process.exit(1);
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(yellow('\n⚠️  WARNING: This will modify the database structure!'));
console.log('This migration will convert guest_post_cost from DECIMAL to INTEGER.');
console.log('940 records will be affected.\n');

rl.question('Do you want to proceed? (yes/no): ', (answer: string) => {
  if (answer.toLowerCase() === 'yes') {
    rl.close();
    runMigration().then(() => process.exit(0));
  } else {
    console.log(yellow('Migration cancelled.'));
    rl.close();
    process.exit(0);
  }
});