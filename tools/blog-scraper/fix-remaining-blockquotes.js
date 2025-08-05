import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixRemainingBlockquotes() {
  const appDir = path.resolve(__dirname, '../../app');
  
  // Files that still have blockquote issues
  const pagesToFix = [
    'how-to-write-email-outreach-pitch',
    'link-building-costs',
    'link-prospecting',
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
        
        // Fix standalone blockquote lines
        const lines = content.split('\n');
        const fixedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          // Check if this line starts with > (markdown blockquote)
          // But not JSX closing tags or comparison operators
          if (trimmedLine.startsWith('>') && 
              !trimmedLine.startsWith('><') && 
              !trimmedLine.includes('/>') &&
              !trimmedLine.includes('=>')) {
            const quoteContent = trimmedLine.substring(1).trim();
            // Wrap in blockquote tag with proper escaping
            const escapedContent = quoteContent
              .replace(/'/g, "\\'")
              .replace(/"/g, '\\"');
            fixedLines.push(`        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-2">${escapedContent}</blockquote>`);
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
fixRemainingBlockquotes().catch(console.error);