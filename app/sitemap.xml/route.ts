import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

// Function to get dynamic niche pages from database
async function getDynamicNichePages() {
  try {
    // Get niches with at least 10 websites (same logic as generateStaticParams)
    const websitesResult = await db.execute(sql`
      SELECT 
        UNNEST(niche) as niche_name,
        COUNT(*) as website_count
      FROM websites
      WHERE niche IS NOT NULL 
        AND array_length(niche, 1) > 0
      GROUP BY niche_name
      HAVING COUNT(*) >= 10
    `);
    
    return websitesResult.rows.map((row: any) => {
      const nicheSlug = row.niche_name
        .toLowerCase()
        .replace(/[&\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-blogs';
      
      return {
        path: `guest-posting-sites/${nicheSlug}`,
        priority: 0.8,
        changefreq: 'weekly'
      };
    });
  } catch (error) {
    console.warn('Could not fetch niche pages for sitemap:', error);
    return [];
  }
}

// Static pages
const pages = [
  // Core pages
  { path: '', priority: 1.0, changefreq: 'weekly' },
  { path: 'blog', priority: 0.9, changefreq: 'daily' },
  { path: 'how-it-works', priority: 0.8, changefreq: 'monthly' },
  { path: 'industries', priority: 0.8, changefreq: 'monthly' },
  { path: 'contact', priority: 0.7, changefreq: 'monthly' },
  
  // Service pages
  { path: 'best-link-building-services', priority: 0.9, changefreq: 'weekly' },
  { path: 'best-guest-posting-services', priority: 0.9, changefreq: 'weekly' },
  { path: 'best-blogger-outreach-services', priority: 0.9, changefreq: 'weekly' },
  { path: 'best-citation-building-services', priority: 0.8, changefreq: 'weekly' },
  
  // Industry pages
  { path: 'saas-link-building', priority: 0.8, changefreq: 'monthly' },
  { path: 'ecommerce-link-building', priority: 0.8, changefreq: 'monthly' },
  { path: 'b2b-services-link-building', priority: 0.8, changefreq: 'monthly' },
  { path: 'local-business-link-building', priority: 0.8, changefreq: 'monthly' },
  
  // Tool pages
  { path: 'anchor-text-optimizer', priority: 0.8, changefreq: 'weekly' },
  { path: 'guest-posting-sites', priority: 0.8, changefreq: 'weekly' },
  
  // Educational content & Blog articles
  { path: 'top-10-link-building-techniques', priority: 0.8, changefreq: 'monthly' },
  { path: 'how-to-increase-domain-authority', priority: 0.8, changefreq: 'monthly' },
  { path: 'seo-tutorial', priority: 0.8, changefreq: 'monthly' },
  { path: 'seo-case-study', priority: 0.8, changefreq: 'monthly' },
  { path: 'ecommerce-seo-case-study', priority: 0.8, changefreq: 'monthly' },
  { path: 'broken-link-building-guide', priority: 0.8, changefreq: 'monthly' },
  { path: 'edu-link-building-guide', priority: 0.8, changefreq: 'monthly' },
  { path: 'how-to-get-high-authority-backlinks', priority: 0.8, changefreq: 'monthly' },
  { path: 'link-prospecting', priority: 0.8, changefreq: 'monthly' },
  { path: 'link-building-costs', priority: 0.8, changefreq: 'monthly' },
  { path: 'anchor-text', priority: 0.7, changefreq: 'monthly' },
  { path: 'how-to-find-email-addresses', priority: 0.7, changefreq: 'monthly' },
  { path: 'best-seo-books-recommended-by-pros', priority: 0.7, changefreq: 'monthly' },
  { path: 'how-to-write-listicles', priority: 0.7, changefreq: 'monthly' },
  { path: 'easy-backlinks-simple-strategies', priority: 0.7, changefreq: 'monthly' },
  { path: 'best-rank-tracking-tools-local-businesses', priority: 0.7, changefreq: 'monthly' },
  { path: 'follow-up-email', priority: 0.7, changefreq: 'monthly' },
  { path: 'email-outreach-templates', priority: 0.7, changefreq: 'monthly' },
  { path: 'how-to-create-link-bait', priority: 0.7, changefreq: 'monthly' },
  { path: 'resource-page-link-building-guide', priority: 0.7, changefreq: 'monthly' },
  { path: 'seo-webinars', priority: 0.7, changefreq: 'monthly' },
  { path: 'best-directory-submission-services', priority: 0.7, changefreq: 'monthly' },
  { path: 'guide-to-grow-your-blogs-audience', priority: 0.7, changefreq: 'monthly' },
  { path: 'how-to-use-seo-to-improve-conversion-rate', priority: 0.7, changefreq: 'monthly' },
  { path: 'link-disavows-good-or-bad', priority: 0.7, changefreq: 'monthly' },
  { path: 'how-to-sort-and-filter-link-prospects', priority: 0.7, changefreq: 'monthly' },
  { path: 'using-seo-for-lead-generation', priority: 0.7, changefreq: 'monthly' },
  { path: 'top-seo-agencies', priority: 0.7, changefreq: 'monthly' },
  { path: 'simple-backlink-strategies', priority: 0.7, changefreq: 'monthly' },
  { path: 'best-content-seo-tools', priority: 0.7, changefreq: 'monthly' },
  { path: 'how-to-write-listicles', priority: 0.7, changefreq: 'monthly' },
  { path: 'best-rank-tracking-tools-for-local-businesses', priority: 0.7, changefreq: 'monthly' },
  { path: 'the-best-books-to-learn-seo', priority: 0.7, changefreq: 'monthly' },
  { path: 'how-to-create-a-content-marketing-strategy-for-ecommerce', priority: 0.7, changefreq: 'monthly' },
  { path: 'how-to-choose-the-best-seo-software-for-your-business', priority: 0.7, changefreq: 'monthly' },
  { path: 'why-every-business-needs-a-website', priority: 0.7, changefreq: 'monthly' },
  
  // Resource pages
  { path: 'best-email-finders', priority: 0.7, changefreq: 'monthly' },
  { path: 'best-seo-newsletters', priority: 0.6, changefreq: 'monthly' },
  { path: 'googles-latest-algorithm-updates', priority: 0.7, changefreq: 'weekly' },
  
  // Legal pages
  { path: 'privacy', priority: 0.3, changefreq: 'yearly' },
  { path: 'terms', priority: 0.3, changefreq: 'yearly' },
  { path: 'cookies', priority: 0.3, changefreq: 'yearly' },
];

export async function GET(request: Request) {
  const { protocol, host } = new URL(request.url);
  const baseUrl = `${protocol}//${host}`;
  const currentDate = new Date().toISOString();
  
  // Fetch dynamic niche pages from database
  const dynamicNichePages = await getDynamicNichePages();
  
  // Combine static and dynamic pages
  const allPages = [...pages, ...dynamicNichePages];
  
  // TODO: Add other dynamic content like blog posts when available
  // const blogPosts = await db.query('SELECT slug FROM posts WHERE published = true');
  // const blogPages = blogPosts.map(post => ({ 
  //   path: `blog/${post.slug}`, 
  //   priority: 0.7, 
  //   changefreq: 'weekly' 
  // }));
  // allPages.push(...blogPages);
  
  const urlEntries = allPages.map(page => {
    const loc = page.path ? `${baseUrl}/${page.path}` : baseUrl;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`;
  }).join('\n');

  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new NextResponse(sitemapXML, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}