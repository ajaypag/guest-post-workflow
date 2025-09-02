#!/usr/bin/env npx tsx
/**
 * Script to bulk import ManyReach API keys
 * 
 * Usage:
 * 1. Create a file called manyreach-keys.txt with format:
 *    workspace_name:api_key
 *    (one per line)
 * 
 * 2. Run: npx tsx scripts/import-manyreach-keys.ts manyreach-keys.txt
 * 
 * Or use stdin:
 *    echo "main:2a88c29a-87c0-4420-b286-ab11f134c525" | npx tsx scripts/import-manyreach-keys.ts
 */

import { ManyReachApiKeyService } from '@/lib/services/manyreachApiKeyService';
import fs from 'fs';
import readline from 'readline';

async function importKeys(input: string | NodeJS.ReadStream) {
  const keys: Array<{ workspace: string; apiKey: string }> = [];
  
  // Create readline interface
  const rl = readline.createInterface({
    input: typeof input === 'string' ? fs.createReadStream(input) : input,
    crlfDelay: Infinity
  });
  
  console.log('📥 Reading API keys...');
  
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue; // Skip empty lines and comments
    
    const [workspace, apiKey] = trimmed.split(':').map(s => s.trim());
    
    if (!workspace || !apiKey) {
      console.warn(`⚠️ Skipping invalid line: ${line}`);
      continue;
    }
    
    keys.push({ workspace, apiKey });
  }
  
  if (keys.length === 0) {
    console.error('❌ No valid keys found');
    process.exit(1);
  }
  
  console.log(`\n🔑 Found ${keys.length} API keys to import`);
  
  // Import keys
  let imported = 0;
  let failed = 0;
  
  for (const { workspace, apiKey } of keys) {
    try {
      await ManyReachApiKeyService.storeApiKey(workspace, apiKey);
      console.log(`✅ Imported: ${workspace}`);
      imported++;
    } catch (error) {
      console.error(`❌ Failed to import ${workspace}:`, error);
      failed++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Failed: ${failed}`);
  
  // List all workspaces
  console.log('\n📋 All configured workspaces:');
  const workspaces = await ManyReachApiKeyService.listWorkspaces();
  
  for (const ws of workspaces) {
    console.log(`   • ${ws.workspace_name} (${ws.is_active ? 'active' : 'inactive'})`);
  }
}

// Main execution
async function main() {
  const inputFile = process.argv[2];
  
  if (inputFile && fs.existsSync(inputFile)) {
    console.log(`📂 Reading from file: ${inputFile}`);
    await importKeys(inputFile);
  } else if (!process.stdin.isTTY) {
    console.log('📥 Reading from stdin...');
    await importKeys(process.stdin);
  } else {
    console.log(`
ManyReach API Key Import Tool
=============================

Usage:
  npx tsx scripts/import-manyreach-keys.ts <file>
  
File format (one per line):
  workspace_name:api_key
  
Example file content:
  main:2a88c29a-87c0-4420-b286-ab11f134c525
  client-acme:900b0cdf-5769-4df2-84d8-00714914d79f
  client-xyz:3c88d29a-98d1-5531-95e7-12824314e636
  
Or pipe from stdin:
  cat keys.txt | npx tsx scripts/import-manyreach-keys.ts
    `);
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch(console.error);