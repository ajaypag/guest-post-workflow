import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixMisplacedBlockquotes() {
  const appDir = path.resolve(__dirname, '../../app');
  
  // Get all page directories
  const directories = await fs.readdir(appDir);
  const pageDirs = directories.filter(dir => 
    !dir.startsWith('.') && 
    !dir.startsWith('(') && 
    dir !== 'api' &&
    dir !== 'layout.tsx' &&
    dir !== 'page.tsx'
  );

  let fixedCount = 0;
  let errorCount = 0;
  let checkedCount = 0;

  for (const pageSlug of pageDirs) {
    const pagePath = path.join(appDir, pageSlug, 'page.tsx');
    
    if (await fs.pathExists(pagePath)) {
      checkedCount++;
      try {
        let content = await fs.readFile(pagePath, 'utf-8');
        let originalContent = content;
        
        // Fix misplaced empty blockquotes that appear right after readTime prop
        // Pattern: readTime="..." followed by empty blockquote before the closing >
        content = content.replace(
          /readTime="[^"]+"\s*<blockquote[^>]*><\/blockquote>\s*>/g,
          (match) => {
            const readTimeMatch = match.match(/readTime="[^"]+"/);
            return readTimeMatch ? readTimeMatch[0] + '\n    >' : match;
          }
        );
        
        // Alternative pattern: readTime prop followed by blockquote on new line
        content = content.replace(
          /readTime="[^"]+"\n\s*<blockquote[^>]*><\/blockquote>\n\s*>/g,
          (match) => {
            const readTimeMatch = match.match(/readTime="[^"]+"/);
            return readTimeMatch ? readTimeMatch[0] + '\n    >' : match;
          }
        );
        
        if (content !== originalContent) {
          await fs.writeFile(pagePath, content);
          console.log(`✅ Fixed: ${pageSlug}`);
          fixedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error fixing ${pageSlug}:`, error.message);
        errorCount++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Checked: ${checkedCount} pages`);
  console.log(`   Fixed: ${fixedCount} pages`);
  console.log(`   Errors: ${errorCount} pages`);
}

// Run the fix
fixMisplacedBlockquotes().catch(console.error);