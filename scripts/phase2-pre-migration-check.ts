#!/usr/bin/env npx tsx
/**
 * Phase 2 Pre-Migration Check
 * Analyzes current state before converting guest_post_cost to cents
 */

import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

async function checkDatabaseState() {
  console.log('\n' + blue('═'.repeat(70)));
  console.log(blue('PHASE 2 PRE-MIGRATION CHECK'));
  console.log(blue('Converting guest_post_cost from DECIMAL to INTEGER (cents)'));
  console.log(blue('═'.repeat(70)) + '\n');

  try {
    // 1. Check column type
    console.log(yellow('▶ Current Column Information\n'));
    const columnInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        numeric_precision,
        numeric_scale,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND column_name = 'guest_post_cost'
    `);
    
    if (columnInfo.rows.length > 0) {
      const col = columnInfo.rows[0];
      console.log(`  Column: ${cyan('guest_post_cost')}`);
      console.log(`  Type: ${cyan(col.data_type)} (${col.numeric_precision},${col.numeric_scale})`);
      console.log(`  Nullable: ${col.is_nullable}`);
    }

    // 2. Sample current values
    console.log(yellow('\n▶ Sample Current Values (Dollars)\n'));
    const samples = await db.execute(sql`
      SELECT 
        id,
        domain,
        guest_post_cost
      FROM websites 
      WHERE guest_post_cost IS NOT NULL
      ORDER BY guest_post_cost DESC
      LIMIT 5
    `);
    
    console.log('  Top 5 Most Expensive:');
    samples.rows.forEach((row: any) => {
      const dollars = parseFloat(row.guest_post_cost || '0');
      const cents = Math.round(dollars * 100);
      console.log(`    ${row.domain}: $${dollars.toFixed(2)} → ${cents} cents`);
    });

    // 3. Check for potential issues
    console.log(yellow('\n▶ Data Quality Check\n'));
    
    // Check for non-standard decimal places
    const nonStandard = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites 
      WHERE guest_post_cost IS NOT NULL
      AND guest_post_cost::text ~ '\\.[0-9]{3,}'
    `);
    console.log(`  Non-standard decimals (>2 places): ${nonStandard.rows[0].count}`);

    // Check for very large values
    const largeValues = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites 
      WHERE guest_post_cost > 10000
    `);
    console.log(`  Values over $10,000: ${largeValues.rows[0].count}`);

    // Check for zero or negative values
    const zeroOrNegative = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites 
      WHERE guest_post_cost <= 0
    `);
    console.log(`  Zero or negative values: ${zeroOrNegative.rows[0].count}`);

    // 4. Count affected records
    console.log(yellow('\n▶ Migration Impact\n'));
    const totalRecords = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(guest_post_cost) as with_price,
        COUNT(*) - COUNT(guest_post_cost) as without_price
      FROM websites
    `);
    
    const stats = totalRecords.rows[0];
    console.log(`  Total websites: ${cyan(stats.total)}`);
    console.log(`  With pricing: ${green(stats.with_price)}`);
    console.log(`  Without pricing: ${yellow(stats.without_price)}`);

    // 5. Preview conversion
    console.log(yellow('\n▶ Conversion Preview\n'));
    const preview = await db.execute(sql`
      SELECT 
        guest_post_cost as dollars,
        ROUND(guest_post_cost * 100)::INTEGER as cents,
        COUNT(*) as count
      FROM websites 
      WHERE guest_post_cost IS NOT NULL
      GROUP BY guest_post_cost
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('  Most common prices:');
    preview.rows.forEach((row: any) => {
      const dollars = parseFloat(row.dollars || '0');
      console.log(`    $${dollars.toFixed(2)} → ${row.cents} cents (${row.count} websites)`);
    });

    // 6. Check related tables
    console.log(yellow('\n▶ Related Tables Check\n'));
    
    // Check publisher_offerings base_price (should already be in cents)
    const publisherCheck = await db.execute(sql`
      SELECT 
        MIN(base_price) as min_price,
        MAX(base_price) as max_price,
        AVG(base_price)::INTEGER as avg_price
      FROM publisher_offerings
      WHERE base_price IS NOT NULL
    `);
    
    if (publisherCheck.rows[0].min_price) {
      const po = publisherCheck.rows[0];
      console.log(`  publisher_offerings.base_price (already in cents):`);
      console.log(`    Range: ${po.min_price} - ${po.max_price} cents`);
      console.log(`    Average: ${po.avg_price} cents`);
    }

    // 7. Files that will need updating
    console.log(yellow('\n▶ Code Impact Analysis\n'));
    console.log(`  Files to update: ${red('117')}`);
    console.log(`  - API Routes: 25 files`);
    console.log(`  - UI Components: 15 files`);
    console.log(`  - Service Files: 12 files`);
    console.log(`  - Others: 65 files`);

    // Summary
    console.log('\n' + blue('═'.repeat(70)));
    console.log(blue('MIGRATION READINESS'));
    console.log(blue('═'.repeat(70)) + '\n');
    
    const ready = stats.with_price > 0 && parseInt(nonStandard.rows[0].count) === 0;
    
    if (ready) {
      console.log(green('✅ Database is ready for migration'));
      console.log(green(`   ${stats.with_price} records will be converted from dollars to cents`));
    } else {
      console.log(yellow('⚠️  Review the issues above before proceeding'));
    }
    
    console.log('\n' + cyan('Next Steps:'));
    console.log('  1. Create database backup');
    console.log('  2. Run migration: ALTER TABLE websites ALTER COLUMN guest_post_cost TYPE INTEGER USING (ROUND(guest_post_cost * 100)::INTEGER)');
    console.log('  3. Update schema file: lib/db/websiteSchema.ts');
    console.log('  4. Update all 117 files to handle cents instead of dollars');
    
    console.log('\n' + blue('═'.repeat(70)) + '\n');

  } catch (error) {
    console.error(red('Error checking database:'), error);
    process.exit(1);
  }
}

// Run the check
checkDatabaseState().then(() => process.exit(0));