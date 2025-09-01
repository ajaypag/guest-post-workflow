#!/usr/bin/env npx tsx
/**
 * Phase 2 File Updates
 * Automatically updates files to handle guest_post_cost as cents
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

interface FileUpdate {
  file: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

const updates: FileUpdate[] = [
  // API Routes - Remove parseFloat conversions
  {
    file: '**/api/**/*.ts',
    pattern: /parseFloat\(([^)]*\.guest_post_cost[^)]*)\)\s*\*\s*100/g,
    replacement: '$1',
    description: 'Remove parseFloat and *100 from API routes'
  },
  {
    file: '**/api/**/*.ts',
    pattern: /parseFloat\(([^)]*\.guestPostCost[^)]*)\)\s*\*\s*100/g,
    replacement: '$1',
    description: 'Remove parseFloat and *100 from API routes (camelCase)'
  },
  {
    file: '**/api/**/*.ts',
    pattern: /parseFloat\(([^)]*\.guest_post_cost[^)]*)\)/g,
    replacement: '$1',
    description: 'Remove parseFloat from guest_post_cost'
  },
  {
    file: '**/api/**/*.ts',
    pattern: /parseFloat\(([^)]*\.guestPostCost[^)]*)\)/g,
    replacement: '$1',
    description: 'Remove parseFloat from guestPostCost'
  },
  
  // UI Components - Add division for display
  {
    file: '**/components/**/*.tsx',
    pattern: /\$\{parseFloat\(([^)]*guestPostCost[^)]*)\)\}/g,
    replacement: '${($1 / 100).toFixed(2)}',
    description: 'Add division by 100 for UI display'
  },
  {
    file: '**/components/**/*.tsx',
    pattern: /\$\{website\.guestPostCost\}/g,
    replacement: '${(website.guestPostCost / 100).toFixed(2)}',
    description: 'Convert cents to dollars for display'
  },
  
  // Services - Remove conversion logic
  {
    file: '**/services/**/*.ts',
    pattern: /parseFloat\(([^)]*\.guest_post_cost[^)]*)\)\s*\*\s*100/g,
    replacement: '$1',
    description: 'Remove conversion in services'
  },
  {
    file: '**/services/**/*.ts',
    pattern: /parseFloat\(([^)]*\.guestPostCost[^)]*)\)\s*\*\s*100/g,
    replacement: '$1',
    description: 'Remove conversion in services (camelCase)'
  }
];

async function updateFiles() {
  console.log('\n' + blue('═'.repeat(70)));
  console.log(blue('PHASE 2 FILE UPDATES'));
  console.log(blue('Updating files to handle cents'));
  console.log(blue('═'.repeat(70)) + '\n');

  let totalUpdates = 0;
  let filesUpdated = new Set<string>();

  for (const update of updates) {
    console.log(yellow(`\n▶ ${update.description}\n`));
    
    const files = await glob(update.file, {
      ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
      cwd: process.cwd()
    });
    
    for (const file of files) {
      const filePath = path.join(process.cwd(), file);
      
      try {
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;
        
        // Apply the pattern replacement
        content = content.replace(update.pattern, update.replacement);
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          filesUpdated.add(file);
          totalUpdates++;
          console.log(`  ✅ Updated: ${cyan(file)}`);
        }
      } catch (error) {
        console.error(`  ❌ Error updating ${file}:`, error.message);
      }
    }
  }

  // Summary
  console.log('\n' + blue('═'.repeat(70)));
  console.log(blue('UPDATE SUMMARY'));
  console.log(blue('═'.repeat(70)) + '\n');
  
  console.log(`  Total files updated: ${green(filesUpdated.size.toString())}`);
  console.log(`  Total replacements: ${green(totalUpdates.toString())}`);
  
  if (filesUpdated.size > 0) {
    console.log('\n' + cyan('Files updated:'));
    Array.from(filesUpdated).sort().forEach(file => {
      console.log(`    - ${file}`);
    });
  }
  
  console.log('\n' + cyan('Next Steps:'));
  console.log('  1. Review the changes');
  console.log('  2. Run tests: npm test');
  console.log('  3. Check TypeScript: npx tsc --noEmit');
  
  console.log('\n' + blue('═'.repeat(70)) + '\n');
}

// Run the updates
updateFiles().then(() => process.exit(0)).catch(error => {
  console.error(red('Update failed:'), error);
  process.exit(1);
});