import { NextResponse } from 'next/server';

// All blog posts
// Only include blog posts that actually exist
const blogPosts = [
  'anchor-text',
  'seo-tutorial', 
  'broken-link-building-guide',
  'how-to-get-high-authority-backlinks',
  'best-email-finders',
  'how-to-find-email-addresses',
  'ecommerce-seo-case-study',
  'edu-link-building-guide',
  'best-seo-books-recommended-by-pros',
  'link-building-costs',
  'how-to-write-listicles',
  'best-content-seo-tools',
  'easy-backlinks-simple-strategies',
  'best-rank-tracking-tools-local-businesses',
  'directory-submission-sites'
];

// Main app pages that should be indexed
const appPages = [
  { path: '', priority: '1.0', changefreq: 'weekly' },
  { path: 'blog', priority: '0.9', changefreq: 'daily' },
  { path: 'anchor-text-optimizer', priority: '0.8', changefreq: 'weekly' },
  { path: 'guest-posting-sites', priority: '0.7', changefreq: 'weekly' },
  { path: 'guest-posting-sites/search-query-generator', priority: '0.6', changefreq: 'weekly' },
  { path: 'signup', priority: '0.5', changefreq: 'monthly' },
  { path: 'login', priority: '0.4', changefreq: 'monthly' }
];

export async function GET(request: Request) {
  const { protocol, host } = new URL(request.url);
  const baseUrl = `${protocol}//${host}`;
  const currentDate = new Date().toISOString();
  
  // App pages XML
  const appPagesXML = appPages.map(page => `
  <url>
    <loc>${baseUrl}/${page.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

  // Blog posts XML
  const blogPostsXML = blogPosts.map(post => `
  <url>
    <loc>${baseUrl}/${post}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${appPagesXML}
  ${blogPostsXML}
</urlset>`;

  return new NextResponse(sitemapXML, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400'
    }
  });
}