import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map of page slugs to metadata
const pageMetadata = {
  'how-to-sort-and-filter-link-prospects': {
    title: 'How to Sort and Filter Link Prospects',
    description: 'Complete guide to sorting and filtering link prospects for effective outreach',
    date: 'November 15, 2022',
    readTime: '10 min read'
  },
  'seo-case-study': {
    title: 'SEO Case Study',
    description: 'Real-world SEO case study with actionable insights',
    date: 'September 10, 2022',
    readTime: '8 min read'
  },
  'seo-proposal': {
    title: 'SEO Proposal Template',
    description: 'Professional SEO proposal template to win clients',
    date: 'September 5, 2022',
    readTime: '12 min read'
  },
  'best-guest-posting-services': {
    title: 'Best Guest Posting Services',
    description: 'Top guest posting services reviewed and compared',
    date: 'August 30, 2022',
    readTime: '15 min read'
  },
  'googles-latest-algorithm-updates': {
    title: "Google's Latest Algorithm Updates",
    description: 'Stay updated with the latest Google algorithm changes',
    date: 'August 28, 2022',
    readTime: '7 min read'
  },
  'best-seo-newsletters': {
    title: 'Best SEO Newsletters',
    description: 'Top SEO newsletters to stay ahead of the curve',
    date: 'August 26, 2022',
    readTime: '6 min read'
  },
  'follow-up-email': {
    title: 'Follow-Up Email Templates',
    description: 'Effective follow-up email templates for link building',
    date: 'August 24, 2022',
    readTime: '5 min read'
  },
  'email-outreach-templates': {
    title: 'Email Outreach Templates',
    description: 'Proven email templates for successful outreach campaigns',
    date: 'August 22, 2022',
    readTime: '8 min read'
  },
  'link-building-costs': {
    title: 'Link Building Costs Guide',
    description: 'Comprehensive guide to link building pricing and costs',
    date: 'August 20, 2022',
    readTime: '10 min read'
  }
};

async function convertToNextJS() {
  const batchDir = path.join(__dirname, 'output', 'batch-2025-08-05-1754419331366');
  const appDir = path.resolve(__dirname, '../../app');
  
  const pages = await fs.readdir(batchDir);
  
  for (const page of pages) {
    if (page.startsWith('batch-')) continue;
    
    const pageSlug = page.replace(/^\d{3}-/, '');
    const contentFile = path.join(batchDir, page, 'content.md');
    
    // Skip if page already exists
    const targetDir = path.join(appDir, pageSlug);
    if (await fs.pathExists(targetDir)) {
      console.log(`✓ Page already exists: ${pageSlug}`);
      continue;
    }
    
    if (await fs.pathExists(contentFile)) {
      try {
        // Read the markdown content
        let content = await fs.readFile(contentFile, 'utf-8');
        
        // Clean up the content
        content = content
          .replace(/^# .*\n\n/, '') // Remove first title (duplicate)
          .replace(/^# .*\n\n/, '') // Remove second title if exists
          .trim();
        
        // Extract sections for table of contents
        const sections = [];
        const lines = content.split('\n');
        lines.forEach(line => {
          if (line.startsWith('## ')) {
            const title = line.replace('## ', '').trim();
            const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            sections.push({ title, id });
          }
        });
        
        // Convert markdown to JSX-friendly format
        const processedContent = content
          .split('\n\n')
          .map(paragraph => {
            if (paragraph.startsWith('## ')) {
              const title = paragraph.replace('## ', '').trim();
              const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              return `<h2 id="${id}">${title}</h2>`;
            } else if (paragraph.startsWith('### ')) {
              const title = paragraph.replace('### ', '').trim();
              const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              return `<h3 id="${id}">${title}</h3>`;
            } else if (paragraph.startsWith('• ')) {
              const items = paragraph.split('\n').map(item => 
                `<li>${item.replace('• ', '').trim()}</li>`
              ).join('\n          ');
              return `<ul className="list-disc pl-6 space-y-2">
          ${items}
        </ul>`;
            } else if (paragraph.trim()) {
              return `<p>${paragraph.trim()}</p>`;
            }
            return '';
          })
          .filter(Boolean)
          .join('\n\n        ');
        
        // Get metadata
        const meta = pageMetadata[pageSlug] || {
          title: pageSlug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
          description: 'Learn more about ' + pageSlug.replace(/-/g, ' '),
          date: 'August 2022',
          readTime: '8 min read'
        };
        
        // Create the page component
        const pageContent = `import BlogPostTemplate from '@/components/BlogPostTemplate';

export const metadata = {
  title: '${meta.title} | PostFlow',
  description: '${meta.description}',
};

export default function ${pageSlug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')}Page() {
  return (
    <BlogPostTemplate
      title="${meta.title}"
      metaDescription="${meta.description}"
      publishDate="${meta.date}"
      author="Ajay Paghdal"
      readTime="${meta.readTime}"
    >
      ${sections.length > 0 ? `<div className="bg-gray-100 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          ${sections.map(s => 
            `<li><a href="#${s.id}" className="hover:text-blue-600">${s.title}</a></li>`
          ).join('\n          ')}
        </ul>
      </div>

      ` : ''}
      <div className="prose prose-lg max-w-none">
        ${processedContent}
      </div>
    </BlogPostTemplate>
  );
}`;
        
        // Create the directory and save the file
        await fs.ensureDir(targetDir);
        await fs.writeFile(path.join(targetDir, 'page.tsx'), pageContent);
        
        console.log(`✅ Created: ${pageSlug}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${pageSlug}:`, error.message);
      }
    }
  }
  
  console.log('\n✨ Conversion complete!');
}

// Run the conversion
convertToNextJS().catch(console.error);