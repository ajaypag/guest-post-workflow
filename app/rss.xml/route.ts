import { NextResponse } from 'next/server';

// All blog posts with metadata
const blogPosts = [
  {
    title: 'Resource Page Link Building Guide',
    slug: 'resource-page-link-building-guide',
    description: 'Complete guide to finding and securing links from high-quality resource pages.',
    publishDate: '2024-01-15',
    author: 'PostFlow Team'
  },
  {
    title: 'Anchor Text Optimization for Link Building',
    slug: 'anchor-text',
    description: 'Master safe anchor text strategies with optimal ratios and natural-sounding phrases.',
    publishDate: '2023-03-20',
    author: 'PostFlow Team'
  },
  {
    title: 'SEO Tutorial: Complete Guide for Beginners',
    slug: 'seo-tutorial',
    description: 'Comprehensive SEO tutorial covering on-page, off-page, and technical optimization.',
    publishDate: '2024-02-10',
    author: 'PostFlow Team'
  },
  {
    title: 'Broken Link Building Guide',
    slug: 'broken-link-building-guide',
    description: 'Step-by-step guide to finding broken links and turning them into high-quality backlinks.',
    publishDate: '2024-02-05',
    author: 'PostFlow Team'
  },
  {
    title: 'How to Get High Authority Backlinks',
    slug: 'how-to-get-high-authority-backlinks',
    description: 'Proven strategies to secure backlinks from high-authority websites using guest posting and HARO.',
    publishDate: '2024-01-25',
    author: 'PostFlow Team'
  },
  {
    title: 'Best Email Finders (Free & Paid)',
    slug: 'best-email-finders',
    description: 'Comprehensive comparison of 28+ email finder tools with pricing and features.',
    publishDate: '2024-01-20',
    author: 'PostFlow Team'
  },
  {
    title: 'How to Find Email Addresses',
    slug: 'how-to-find-email-addresses',
    description: 'Learn to find email addresses using 30+ free tools and manual techniques with 2K+ free credits.',
    publishDate: '2024-03-10',
    author: 'PostFlow Team'
  },
  {
    title: 'Ecommerce SEO Case Study',
    slug: 'ecommerce-seo-case-study',
    description: 'Month-by-month case study showing how we built 128 backlinks and achieved page 1 rankings.',
    publishDate: '2020-08-15',
    author: 'PostFlow Team'
  },
  {
    title: '.EDU Link Building Guide',
    slug: 'edu-link-building-guide',
    description: 'Complete guide to building high-quality .EDU backlinks through scholarship strategies.',
    publishDate: '2020-11-20',
    author: 'PostFlow Team'
  },
  {
    title: 'Best SEO Books Recommended by Pros',
    slug: 'best-seo-books-recommended-by-pros',
    description: 'Essential SEO books recommended by industry experts with reading plans and key takeaways.',
    publishDate: '2024-01-10',
    author: 'PostFlow Team'
  }
];

export async function GET() {
  const baseUrl = 'https://linkio.com';
  
  const rssItems = blogPosts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/${post.slug}</link>
      <guid>${baseUrl}/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.publishDate).toUTCString()}</pubDate>
      <author>${post.author}</author>
      <category>SEO</category>
      <category>Link Building</category>
      <category>Digital Marketing</category>
    </item>
  `).join('');

  const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Linkio SEO & Link Building Blog</title>
    <link>${baseUrl}</link>
    <description>Advanced SEO strategies, link building techniques, and expert insights from Linkio</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <managingEditor>noreply@linkio.com (Linkio Team)</managingEditor>
    <webMaster>noreply@linkio.com (Linkio Team)</webMaster>
    <category>SEO</category>
    <category>Link Building</category>
    <category>Digital Marketing</category>
    <ttl>1440</ttl>
    ${rssItems}
  </channel>
</rss>`;

  return new NextResponse(rssContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}