#!/usr/bin/env npx tsx
/**
 * Script to rename existing workspaces based on their ManyReach account info
 */

import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { ManyReachApiKeyService } from '@/lib/services/manyreachApiKeyService';

async function renameWorkspaces() {
  console.log('🔄 Fetching existing workspaces...');
  
  // Get all workspaces
  const workspaces = await ManyReachApiKeyService.listWorkspaces();
  
  console.log(`Found ${workspaces.length} workspaces\n`);
  
  const renameMap: Record<string, string> = {};
  const usedNames = new Set<string>();
  
  for (const ws of workspaces) {
    if (!ws.is_active) continue;
    
    console.log(`\n📍 Processing: ${ws.workspace_name}`);
    
    try {
      // Get the API key
      const apiKey = await ManyReachApiKeyService.getApiKey(ws.workspace_name);
      
      if (!apiKey) {
        console.log('  ⚠️ No API key found');
        continue;
      }
      
      // Fetch account info from ManyReach
      const response = await fetch(`https://app.manyreach.com/api/campaigns?apikey=${apiKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        console.log(`  ❌ API call failed: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      // Generate a better name
      let newName = ws.workspace_name;
      
      if (data.account) {
        // Clean up account name
        const cleanName = data.account
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 25);
        
        // Make it unique
        let baseName = cleanName;
        let counter = 1;
        while (usedNames.has(cleanName) || (counter > 1 && usedNames.has(`${baseName}-${counter}`))) {
          counter++;
        }
        
        newName = counter > 1 ? `${baseName}-${counter}` : cleanName;
        usedNames.add(newName);
        
        console.log(`  ✅ Account: ${data.account}`);
        console.log(`  📝 New name: ${newName}`);
        
        renameMap[ws.workspace_name] = newName;
      } else {
        console.log('  ⚠️ No account name found');
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }
  
  console.log('\n\n📋 Rename Summary:');
  console.log('==================');
  
  for (const [oldName, newName] of Object.entries(renameMap)) {
    console.log(`  ${oldName} → ${newName}`);
  }
  
  console.log('\n❓ Do you want to apply these renames? (y/n)');
  
  // For now, just show what would be renamed
  // In a real interactive script, we'd wait for user input
  console.log('\nTo apply renames, run:');
  console.log('DATABASE_URL="..." npx tsx scripts/apply-workspace-renames.ts');
  
  // Save the rename map for the apply script
  const fs = await import('fs');
  await fs.promises.writeFile(
    'workspace-renames.json',
    JSON.stringify(renameMap, null, 2)
  );
  
  console.log('\nRename map saved to workspace-renames.json');
}

renameWorkspaces().catch(console.error);