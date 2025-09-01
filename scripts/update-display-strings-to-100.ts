import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Files to update and their replacements
const replacements = [
  // Generic $79 to $100
  { from: /\$79(?!\d)/g, to: '$100' },
  // Specific context replacements  
  { from: /\+ 79(?!\d)/g, to: '+ 100' },
  { from: /79 content/g, to: '100 content' },
  { from: /79 admin fee/g, to: '100 admin fee' },
  { from: /79 service fee/g, to: '100 service fee' },
  { from: /79 flat fee/g, to: '100 flat fee' },
  { from: /79 gets you/g, to: '100 gets you' },
  { from: /79 for professional/g, to: '100 for professional' },
  { from: /79 per link/g, to: '100 per link' },
  { from: /79 full-service/g, to: '100 full-service' },
];

async function updateDisplayStrings() {
  console.log('📝 Updating display strings from $79 to $100...\n');
  
  // Find all TypeScript/TSX files
  const files = await glob('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', '.next/**', 'scripts/update-display-strings-to-100.ts']
  });
  
  let totalUpdates = 0;
  const updatedFiles: string[] = [];
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      let newContent = content;
      let fileUpdates = 0;
      
      for (const { from, to } of replacements) {
        const matches = content.match(from);
        if (matches) {
          newContent = newContent.replace(from, to);
          fileUpdates += matches.length;
        }
      }
      
      if (fileUpdates > 0) {
        writeFileSync(file, newContent);
        console.log(`✅ Updated ${file}: ${fileUpdates} replacements`);
        updatedFiles.push(file);
        totalUpdates += fileUpdates;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Update complete!`);
  console.log(`   Total files updated: ${updatedFiles.length}`);
  console.log(`   Total replacements: ${totalUpdates}`);
  console.log('='.repeat(60));
  
  if (updatedFiles.length > 0) {
    console.log('\n📋 Updated files:');
    updatedFiles.forEach(f => console.log(`   • ${f}`));
  }
}

// Run the update
updateDisplayStrings().catch(console.error);