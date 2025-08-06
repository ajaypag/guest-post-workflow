import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function comprehensiveFix() {
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
        
        // Fix 1: Remove > at the beginning of list items
        content = content.replace(/<li>> /g, '<li>');
        
        // Fix 2: Remove > at the beginning of paragraphs  
        content = content.replace(/<p>> /g, '<p>');
        
        // Fix 3: Fix blockquote syntax that got mangled
        content = content.replace(/>\s+>/g, '>');
        
        // Fix 4: Fix markdown headers in JSX (should be proper JSX elements)
        content = content.replace(/<p>###### ([^<]+)<\/p>/g, '<h6>$1</h6>');
        content = content.replace(/<p>##### ([^<]+)<\/p>/g, '<h5>$1</h5>');
        content = content.replace(/<p>#### ([^<]+)<\/p>/g, '<h4>$1</h4>');
        content = content.replace(/<p>### ([^<]+)<\/p>/g, '<h3>$1</h3>');
        content = content.replace(/<p>## ([^<]+)<\/p>/g, '<h2>$1</h2>');
        content = content.replace(/<p># ([^<]+)<\/p>/g, '<h1>$1</h1>');
        
        // Fix 5: Escape apostrophes in JSX text content
        // But only in text content, not in attribute values
        const escapeApostrophes = (text) => {
          // Split by JSX tags
          const parts = text.split(/(<[^>]+>)/);
          return parts.map((part, i) => {
            // Even indices are text content
            if (i % 2 === 0 && !part.startsWith('<')) {
              // Only escape apostrophes that aren't already escaped
              return part.replace(/([^\\])'/g, "$1\\'");
            }
            return part;
          }).join('');
        };
        
        // Apply apostrophe escaping to content within JSX elements
        const lines = content.split('\n');
        const fixedLines = lines.map(line => {
          // Skip lines that are imports, exports, or JavaScript logic
          if (line.trim().startsWith('import ') || 
              line.trim().startsWith('export ') ||
              line.trim().startsWith('const ') ||
              line.trim().startsWith('let ') ||
              line.trim().startsWith('var ') ||
              line.trim().startsWith('//')) {
            return line;
          }
          
          // Check if line contains JSX text that might need escaping
          if (line.includes('>') && line.includes('<') && line.includes("'")) {
            // Only process the text between > and <
            return line.replace(/>([\s\S]*?)</g, (match, text) => {
              const escaped = text.replace(/'/g, "\\'");
              return `>${escaped}<`;
            });
          }
          
          return line;
        });
        
        // Don't apply the line-by-line apostrophe fix for now, it's too aggressive
        // content = fixedLines.join('\n');
        
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
comprehensiveFix().catch(console.error);