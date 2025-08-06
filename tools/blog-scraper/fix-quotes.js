import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixQuotes() {
  const appDir = path.resolve(__dirname, '../../app');
  
  // List of all pages that were created
  const pagesToFix = [
    'anchor-text',
    'best-blogger-outreach-services',
    'best-content-seo-tools',
    'best-digital-marketing-tips-from-experts',
    'best-directory-submission-services',
    'best-email-finders',
    'best-guest-posting-services',
    'best-link-building-services',
    'best-rank-tracking-tools-for-local-businesses-what-actually-matters',
    'best-seo-newsletters',
    'blogger-outreach-strategies',
    'broken-link-building-guide',
    'ecommerce-seo-case-study',
    'edu-link-building-guide',
    'email-outreach-templates',
    'follow-up-email',
    'from-zero-to-breakthrough-the-marketing-tactic-that-made-it-happen',
    'googles-latest-algorithm-updates',
    'guide-to-grow-your-blogs-audience-in-2023',
    'how-startups-are-winning-with-real-tactics-that-actually-convert',
    'how-to-choose-the-best-seo-software-for-your-business',
    'how-to-create-a-content-marketing-strategy-for-ecommerce',
    'how-to-create-link-bait',
    'how-to-find-email-addresses',
    'how-to-get-high-authority-backlinks',
    'how-to-increase-domain-authority',
    'how-to-plan-software-project-with-seo',
    'how-to-sort-and-filter-link-prospects',
    'how-to-track-multiple-vehicles-with-vehicle-tracking-software',
    'how-to-use-seo-to-improve-your-conversion-rate',
    'how-to-write-email-outreach-pitch',
    'how-to-write-listicles',
    'link-building-costs',
    'link-building-outreach-subject-lines',
    'link-prospecting',
    'seo-case-study',
    'seo-proposal',
    'seo-tutorial',
    'simple-backlink-strategies',
    'social-media-link-building',
    'the-best-books-to-learn-seo-recommended-by-pros',
    'the-role-of-ai-in-seo-and-link-building',
    'top-10-link-building-techniques',
    'top-seo-agencies',
    'using-seo-for-lead-generation-everything-you-need-to-know',
    'why-every-business-needs-a-website',
    'youtube-seo'
  ];

  let fixedCount = 0;
  let errorCount = 0;

  for (const pageSlug of pagesToFix) {
    const pagePath = path.join(appDir, pageSlug, 'page.tsx');
    
    if (await fs.pathExists(pagePath)) {
      try {
        let content = await fs.readFile(pagePath, 'utf-8');
        let originalContent = content;
        
        // Fix mismatched quotes in metadata - title starts with " and ends with '
        content = content.replace(
          /title:\s*"([^"']+)'/g,
          'title: "$1"'
        );
        
        // Fix mismatched quotes in metadata - title starts with ' and ends with "
        content = content.replace(
          /title:\s*'([^"']+)"/g,
          'title: "$1"'
        );
        
        // Fix mismatched quotes in description - starts with ' and ends with "
        content = content.replace(
          /description:\s*'([^"']+)"/g,
          'description: "$1"'
        );
        
        // Fix mismatched quotes in description - starts with " and ends with '
        content = content.replace(
          /description:\s*"([^"']+)'/g,
          'description: "$1"'
        );
        
        // Fix JSX comment syntax errors
        content = content.replace(/{\/\*\s*/g, '{/* ');
        content = content.replace(/\s*\*\//g, ' */}');
        
        // Fix tableOfContents array - mismatched quotes in objects
        // Look for patterns like: { id: 'value", title: "value', icon: Icon }
        content = content.replace(
          /{\s*id:\s*['"]([^'"]+)['"],\s*title:\s*['"]([^'"]+)['"],\s*icon:/g,
          '{ id: "$1", title: "$2", icon:'
        );
        
        // Fix escaped quotes that shouldn't be escaped in certain contexts
        content = content.replace(/\\'/g, "'");
        content = content.replace(/\\"/g, '"');
        
        // Then properly escape apostrophes in JSX text content
        content = content.replace(
          />([^<]*)'([^<]*)</g,
          (match, before, after) => {
            // Don't escape if it's already part of a quote
            if (before.endsWith('"') || before.endsWith("'") || after.startsWith('"') || after.startsWith("'")) {
              return match;
            }
            return `>${before}\\'${after}<`;
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
fixQuotes().catch(console.error);