#!/usr/bin/env tsx
/**
 * Production-Safe Script to Fix Malformed JSON in Target Page Intelligence
 * 
 * This script fixes double-encoded JSON and malformed escape sequences
 * in the researchOutput field of target_page_intelligence records.
 * 
 * Usage:
 *   DATABASE_URL="your-production-db-url" npx tsx scripts/fix-production-intelligence-json.ts
 * 
 * Options:
 *   --dry-run    Show what would be fixed without making changes
 *   --verbose    Show detailed output for each record
 */

import { db } from '../lib/db/connection';
import { targetPageIntelligence } from '../lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

interface ResearchOutput {
  analysis: string;
  gaps: any[];
  sources: any[];
  metadata?: any;
}

// Stats tracking
const stats = {
  total: 0,
  alreadyFixed: 0,
  needsFixing: 0,
  fixed: 0,
  failed: 0,
  skipped: 0
};

async function fixIntelligenceRecords() {
  console.log('🔧 Target Page Intelligence JSON Fix Script');
  console.log('============================================');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '✏️  PRODUCTION UPDATE'}`);
  console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown'}`);
  console.log('');

  try {
    // Get all target page intelligence records
    const records = await db
      .select()
      .from(targetPageIntelligence)
      .where(eq(targetPageIntelligence.briefStatus, 'completed'));

    stats.total = records.length;
    console.log(`📊 Found ${records.length} completed intelligence records to check\n`);

    for (const record of records) {
      if (isVerbose) {
        console.log(`\n📋 Checking record: ${record.id}`);
        console.log(`   Target Page: ${record.targetPageId}`);
      }

      const output = record.researchOutput as ResearchOutput | null;
      
      if (!output) {
        if (isVerbose) console.log('   ⚠️  No research output');
        stats.skipped++;
        continue;
      }

      // Check if this needs fixing
      if (typeof output.analysis === 'string' && 
          output.analysis.startsWith('{') && 
          output.analysis.includes('"analysis"')) {
        
        stats.needsFixing++;
        
        if (isVerbose) {
          console.log('   ⚠️  Found double-encoded JSON in analysis field');
          console.log(`   📏 Analysis length: ${output.analysis.length} chars`);
        }

        try {
          let fixedOutput: ResearchOutput | null = null;
          let fixMethod = '';

          // Try Method 1: Direct JSON parse
          try {
            const parsed = JSON.parse(output.analysis);
            if (parsed.analysis) {
              fixedOutput = {
                analysis: parsed.analysis,
                gaps: parsed.gaps || [],
                sources: parsed.sources || [],
                metadata: output.metadata || {}
              };
              fixMethod = 'Direct parse';
            }
          } catch (e1) {
            // Try Method 2: Fix malformed escape sequences
            try {
              // Fix common escape issues:
              // - Replace backslash-space with just space
              // - Remove invalid escape sequences
              const fixed = output.analysis
                .replace(/\\ /g, ' ')  // Replace backslash-space with space
                .replace(/\\([^"nrt\\])/g, '$1'); // Remove invalid escapes
              
              const parsed = JSON.parse(fixed);
              if (parsed.analysis) {
                fixedOutput = {
                  analysis: parsed.analysis,
                  gaps: parsed.gaps || [],
                  sources: parsed.sources || [],
                  metadata: output.metadata || {}
                };
                fixMethod = 'Fixed escape sequences';
              }
            } catch (e2) {
              // Try Method 3: More aggressive unescaping
              try {
                const unescaped = output.analysis
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\')
                  .replace(/\\n/g, '\n')
                  .replace(/\\t/g, '\t');
                
                const parsed = JSON.parse(unescaped);
                if (parsed.analysis) {
                  fixedOutput = {
                    analysis: parsed.analysis,
                    gaps: parsed.gaps || [],
                    sources: parsed.sources || [],
                    metadata: output.metadata || {}
                  };
                  fixMethod = 'Aggressive unescape';
                }
              } catch (e3) {
                console.error(`   ❌ Failed to fix JSON for record ${record.id}`);
                if (isVerbose) {
                  console.error(`      Error: ${e3}`);
                }
                stats.failed++;
                continue;
              }
            }
          }

          if (fixedOutput) {
            if (!isDryRun) {
              // Update the record
              await db.update(targetPageIntelligence)
                .set({
                  researchOutput: fixedOutput
                })
                .where(eq(targetPageIntelligence.id, record.id));
              
              stats.fixed++;
              console.log(`   ✅ Fixed using ${fixMethod}`);
              console.log(`   📊 Extracted: ${fixedOutput.gaps.length} gaps, ${fixedOutput.sources.length} sources`);
            } else {
              console.log(`   🔍 Would fix using ${fixMethod}`);
              console.log(`   📊 Would extract: ${fixedOutput.gaps.length} gaps, ${fixedOutput.sources.length} sources`);
            }
          }
        } catch (error) {
          console.error(`   ❌ Unexpected error for record ${record.id}: ${error}`);
          stats.failed++;
        }
      } else {
        // Record is already properly formatted
        if (output.gaps && output.gaps.length > 0) {
          stats.alreadyFixed++;
          if (isVerbose) {
            console.log(`   ✓ Already properly formatted (${output.gaps.length} gaps)`);
          }
        } else {
          stats.skipped++;
          if (isVerbose) {
            console.log('   ℹ️  No gaps found but format is correct');
          }
        }
      }
    }

    // Print summary
    console.log('\n========================================');
    console.log('📊 Summary:');
    console.log('========================================');
    console.log(`Total records checked:     ${stats.total}`);
    console.log(`Already properly formatted: ${stats.alreadyFixed}`);
    console.log(`Needed fixing:             ${stats.needsFixing}`);
    if (!isDryRun) {
      console.log(`Successfully fixed:        ${stats.fixed}`);
    } else {
      console.log(`Would fix:                 ${stats.needsFixing}`);
    }
    console.log(`Failed to fix:             ${stats.failed}`);
    console.log(`Skipped (no data/gaps):    ${stats.skipped}`);
    
    if (isDryRun && stats.needsFixing > 0) {
      console.log('\n⚠️  This was a DRY RUN. To apply fixes, run without --dry-run flag');
    }
    
    if (stats.fixed > 0) {
      console.log('\n✅ Fixes applied successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
fixIntelligenceRecords();