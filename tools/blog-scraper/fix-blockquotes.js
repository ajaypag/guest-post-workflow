import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixBlockquotes() {
  const appDir = path.resolve(__dirname, '../../app');
  
  // Files that have blockquote issues
  const pagesToFix = [
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
        
        // Fix standalone blockquote lines (lines that start with >)
        // These should be wrapped in <blockquote> tags
        const lines = content.split('\n');
        const fixedLines = [];
        let inBlockquote = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          // Check if this line starts with > (markdown blockquote)
          if (trimmedLine.startsWith('>') && !trimmedLine.startsWith('><') && !trimmedLine.includes('/>')) {
            const quoteContent = trimmedLine.substring(1).trim();
            // Wrap in blockquote tag
            fixedLines.push(`        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700">${quoteContent}</blockquote>`);
          } else {
            fixedLines.push(line);
          }
        }
        
        content = fixedLines.join('\n');
        
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
fixBlockquotes().catch(console.error);