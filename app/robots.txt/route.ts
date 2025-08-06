import { NextResponse } from 'next/server';

export async function GET() {
  const robotsContent = `# Linkio.com robots.txt

User-agent: *
Allow: /
Allow: /blog
Allow: /anchor-text-optimizer  
Allow: /guest-posting-sites
Allow: /websites
Allow: /contacts

# Disallow private areas
Disallow: /admin/
Disallow: /api/
Disallow: /account/
Disallow: /auth/
Disallow: /orders/
Disallow: /workflow/
Disallow: /clients/
Disallow: /bulk-analysis/
Disallow: /migrate
Disallow: /fix-*
Disallow: /test-*
Disallow: /database-checker
Disallow: /security-test

# Search engine specific
User-agent: Googlebot
Allow: /
Allow: /blog
Allow: /anchor-text-optimizer
Allow: /guest-posting-sites
Allow: /websites
Allow: /contacts
Disallow: /admin/
Disallow: /api/
Disallow: /account/
Disallow: /auth/
Disallow: /orders/
Disallow: /workflow/
Disallow: /clients/
Disallow: /bulk-analysis/

# Sitemap
Sitemap: https://linkio.com/sitemap.xml

# Host directive (optional, some crawlers use this)
Host: https://linkio.com`;

  return new NextResponse(robotsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}