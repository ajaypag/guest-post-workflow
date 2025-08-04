import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { linkioPages } from '@/lib/db/linkioSchema';
import { sql } from 'drizzle-orm';

// Common Linkio pages to track
const PRIORITY_PAGES = [
  // High Priority Landing Pages
  { url: 'https://linkio.com/', title: 'Homepage', type: 'landing_page', priority: 2 },
  { url: 'https://linkio.com/pricing/', title: 'Pricing', type: 'landing_page', priority: 2 },
  { url: 'https://linkio.com/features/', title: 'Features', type: 'landing_page', priority: 2 },
  { url: 'https://linkio.com/link-building-software/', title: 'Link Building Software', type: 'landing_page', priority: 2 },
  
  // Tool Pages
  { url: 'https://linkio.com/anchor-text-generator/', title: 'Anchor Text Generator', type: 'tool_page', priority: 2 },
  { url: 'https://linkio.com/backlink-monitor/', title: 'Backlink Monitor', type: 'tool_page', priority: 1 },
  { url: 'https://linkio.com/disavow-tool/', title: 'Disavow Tool', type: 'tool_page', priority: 1 },
  
  // Resource Pages
  { url: 'https://linkio.com/resources/', title: 'Resources', type: 'resource_page', priority: 1 },
  { url: 'https://linkio.com/case-studies/', title: 'Case Studies', type: 'case_study', priority: 1 },
  { url: 'https://linkio.com/about/', title: 'About', type: 'landing_page', priority: 0 },
  
  // Key Blog Posts (examples - you'd add more)
  { url: 'https://linkio.com/blog/anchor-text-guide/', title: 'Anchor Text Guide', type: 'blog_post', priority: 2, category: 'link-building' },
  { url: 'https://linkio.com/blog/link-building-strategies/', title: 'Link Building Strategies', type: 'blog_post', priority: 2, category: 'link-building' },
];

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    if (action === 'import-priority') {
      // Import priority pages
      const results = [];
      
      for (const page of PRIORITY_PAGES) {
        try {
          const existing = await db.select()
            .from(linkioPages)
            .where(sql`${linkioPages.originalUrl} = ${page.url}`)
            .limit(1);
          
          if (existing.length === 0) {
            const newPage = await db.insert(linkioPages).values({
              originalUrl: page.url,
              originalTitle: page.title,
              pageType: page.type as any,
              priority: page.priority,
              category: page.category,
            }).returning();
            
            results.push({ url: page.url, status: 'added' });
          } else {
            results.push({ url: page.url, status: 'exists' });
          }
        } catch (error) {
          results.push({ url: page.url, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      return NextResponse.json({ 
        message: 'Import completed',
        results,
        summary: {
          total: results.length,
          added: results.filter(r => r.status === 'added').length,
          existed: results.filter(r => r.status === 'exists').length,
          errors: results.filter(r => r.status === 'error').length,
        }
      });
    }
    
    if (action === 'import-url') {
      // Import single URL
      const { url, title, pageType, priority } = await request.json();
      
      const newPage = await db.insert(linkioPages).values({
        originalUrl: url,
        originalTitle: title,
        pageType: pageType || 'other',
        priority: priority || 0,
      }).returning();
      
      return NextResponse.json({ page: newPage[0] });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error importing Linkio pages:', error);
    return NextResponse.json({ error: 'Failed to import pages' }, { status: 500 });
  }
}