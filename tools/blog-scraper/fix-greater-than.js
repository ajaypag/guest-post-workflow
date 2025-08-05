import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixGreaterThan() {
  const appDir = path.resolve(__dirname, '../../app');
  
  // Files that have the > issue based on the errors
  const pagesToFix = [
    'best-blogger-outreach-services',
    'best-guest-posting-services',
    'best-link-building-services',
    'blogger-outreach-strategies'
  ];

  let fixedCount = 0;
  let errorCount = 0;

  for (const pageSlug of pagesToFix) {
    const pagePath = path.join(appDir, pageSlug, 'page.tsx');
    
    if (await fs.pathExists(pagePath)) {
      try {
        let content = await fs.readFile(pagePath, 'utf-8');
        let originalContent = content;
        
        // Fix lines that start with > in list items
        content = content.replace(/<li>> /g, '<li>');
        
        // Fix lines that have > at the beginning of paragraphs
        content = content.replace(/<p>> /g, '<p>');
        
        // Fix standalone > characters in JSX
        content = content.replace(/>\s*>\s*/g, '> ');
        
        if (content !== originalContent) {
          await fs.writeFile(pagePath, content);
          console.log(`✅ Fixed: ${pageSlug}`);
          fixedCount++;
        } else {
          console.log(`✓ Already OK: ${pageSlug}`);
        }
        
      } catch (error) {
        console.error(`❌ Error fixing ${pageSlug}:`, error.message);
        errorCount++;
      }
    } else {
      console.log(`⚠️ Not found: ${pageSlug}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixedCount} pages`);
  console.log(`   Errors: ${errorCount} pages`);
  console.log(`   Total: ${pagesToFix.length} pages`);
}

// Run the fix
fixGreaterThan().catch(console.error);