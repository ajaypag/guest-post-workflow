import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixAllMisplacedBlockquotes() {
  const appDir = path.resolve(__dirname, '../../app');
  
  // Files with the misplaced blockquote issue
  const pagesToFix = [
    'ecommerce-seo-case-study',
    'follow-up-email',
    'from-zero-to-breakthrough-the-marketing-tactic-that-made-it-happen',
    'how-startups-are-winning-with-real-tactics-that-actually-convert',
    'how-to-get-high-authority-backlinks',
    'link-building-outreach-subject-lines'
  ];

  let fixedCount = 0;
  let errorCount = 0;

  for (const pageSlug of pagesToFix) {
    const pagePath = path.join(appDir, pageSlug, 'page.tsx');
    
    if (await fs.pathExists(pagePath)) {
      try {
        let content = await fs.readFile(pagePath, 'utf-8');
        let originalContent = content;
        
        // Fix the pattern: readTime="..." followed by empty blockquote
        // Replace with readTime="..." followed by proper closing >
        content = content.replace(
          /readTime="[^"]+"\n\s*<blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-2"><\/blockquote>\n\s*/g,
          (match) => {
            const readTimeMatch = match.match(/readTime="[^"]+"/);
            return readTimeMatch ? readTimeMatch[0] + '\n    >\n      ' : match;
          }
        );
        
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
fixAllMisplacedBlockquotes().catch(console.error);