import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixJSXComments() {
  const appDir = path.resolve(__dirname, '../../app');
  
  // List of all pages that need fixing
  const pagesToFix = [
    'how-to-sort-and-filter-link-prospects',
    'broken-link-building-guide',
    'email-outreach-templates',
    // Add any other pages that have JSX comment issues
  ];

  let fixedCount = 0;
  let errorCount = 0;

  for (const pageSlug of pagesToFix) {
    const pagePath = path.join(appDir, pageSlug, 'page.tsx');
    
    if (await fs.pathExists(pagePath)) {
      try {
        let content = await fs.readFile(pagePath, 'utf-8');
        let originalContent = content;
        
        // Fix malformed JSX comments
        // Pattern: {/<em> comment </em>/} should be {/* comment */}
        content = content.replace(/{\/\<em\>\s*([^<]*)\s*\<\/em\>\/}/g, '{/* $1 */}');
        
        // Alternative pattern that might exist
        content = content.replace(/{\/\*\s*([^}]*)\s*\*\/}/g, '{/* $1 */}');
        
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
fixJSXComments().catch(console.error);