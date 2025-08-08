import { NextResponse } from 'next/server';

// Static pages for now - can be enhanced with database queries later
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
  
  // Educational content
  { path: 'seo-tutorial', priority: 0.8, changefreq: 'monthly' },
  { path: 'seo-case-study', priority: 0.8, changefreq: 'monthly' },
  { path: 'ecommerce-seo-case-study', priority: 0.8, changefreq: 'monthly' },
  { path: 'broken-link-building-guide', priority: 0.8, changefreq: 'monthly' },
  { path: 'edu-link-building-guide', priority: 0.8, changefreq: 'monthly' },
  { path: 'how-to-get-high-authority-backlinks', priority: 0.8, changefreq: 'monthly' },
  { path: 'link-building-costs', priority: 0.8, changefreq: 'monthly' },
  
  // Resource pages
  { path: 'best-content-seo-tools', priority: 0.7, changefreq: 'monthly' },
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
  
  // TODO: Add database queries here to fetch dynamic content
  // const blogPosts = await db.query('SELECT slug FROM posts WHERE published = true');
  // const dynamicPages = blogPosts.map(post => ({ 
  //   path: `blog/${post.slug}`, 
  //   priority: 0.7, 
  //   changefreq: 'weekly' 
  // }));
  // const allPages = [...pages, ...dynamicPages];
  
  const urlEntries = pages.map(page => {
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