import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import * as fs from 'fs';
import * as path from 'path';

interface PageOption {
  path: string;
  title: string;
  type: 'blog' | 'marketing';
}

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pages = await discoverEditablePages();
    
    return NextResponse.json({ 
      pages,
      total: pages.length 
    });
  } catch (error) {
    console.error('Failed to fetch pages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function discoverEditablePages(): Promise<PageOption[]> {
  const pages: PageOption[] = [];
  const appDir = path.join(process.cwd(), 'app');
  
  // Discover blog pages (routes with page.tsx)
  const blogPages = [
    'how-to-create-a-content-marketing-strategy-for-ecommerce',
    'social-media-link-building', 
    'link-prospecting',
    'why-every-business-needs-a-website',
    'how-to-use-seo-to-improve-conversion-rate',
    'best-link-building-services',
    'best-blogger-outreach-services',
    'how-to-increase-domain-authority',
    'top-10-link-building-techniques',
    'ecommerce-link-building',
    'saas-link-building',
    'local-business-link-building',
    'broken-link-building-guide',
    'resource-page-link-building-guide',
    'guest-posting-sites'
  ];

  // Add blog pages
  for (const slug of blogPages) {
    const pagePath = path.join(appDir, slug, 'page.tsx');
    if (fs.existsSync(pagePath)) {
      const title = slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      pages.push({
        path: `/${slug}`,
        title: title,
        type: 'blog'
      });
    }
  }

  // Add marketing pages
  const marketingPages = [
    { path: '/marketing', title: 'Marketing Homepage' },
    { path: '/how-it-works', title: 'How It Works' },
    { path: '/case-studies', title: 'Case Studies' },
    { path: '/', title: 'Homepage' }
  ];

  for (const marketingPage of marketingPages) {
    const pagePath = path.join(appDir, marketingPage.path === '/' ? 'page.tsx' : marketingPage.path, 'page.tsx');
    if (fs.existsSync(pagePath)) {
      pages.push({
        path: marketingPage.path,
        title: marketingPage.title,
        type: 'marketing'
      });
    }
  }

  return pages.sort((a, b) => a.title.localeCompare(b.title));
}