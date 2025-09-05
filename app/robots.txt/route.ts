import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { protocol, host } = new URL(request.url);
  const baseUrl = `${protocol}//${host}`;
  
  const robotsContent = `# ${host} robots.txt

User-agent: *
Allow: /
Allow: /blog
Allow: /anchor-text-optimizer  
Allow: /guest-posting-sites

# Disallow internal pages
Disallow: /websites
Disallow: /contacts

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
Disallow: /security-test

# Search engine specific
User-agent: Googlebot
Allow: /
Allow: /blog
Allow: /anchor-text-optimizer
Allow: /guest-posting-sites
Disallow: /websites
Disallow: /contacts
Disallow: /admin/
Disallow: /api/
Disallow: /account/
Disallow: /auth/
Disallow: /orders/
Disallow: /workflow/
Disallow: /clients/
Disallow: /bulk-analysis/

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Host directive (optional, some crawlers use this)
Host: ${baseUrl}`;

  return new NextResponse(robotsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}