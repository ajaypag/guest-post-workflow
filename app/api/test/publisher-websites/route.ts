import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherWebsites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publisherId } = body;
    
    if (!publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID is required' },
        { status: 400 }
      );
    }
    
    // Get all websites for this publisher
    const publisherWebsitesQuery = await db
      .select({
        websiteId: websites.id,
        domain: websites.domain,
        categories: websites.categories,
        status: publisherWebsites.status,
      })
      .from(publisherWebsites)
      .innerJoin(websites, eq(websites.id, publisherWebsites.websiteId))
      .where(
        and(
          eq(publisherWebsites.publisherId, publisherId),
          eq(publisherWebsites.status, 'active')
        )
      );
    
    return NextResponse.json({
      success: true,
      publisherId,
      websiteCount: publisherWebsitesQuery.length,
      websites: publisherWebsitesQuery
    });
    
  } catch (error) {
    console.error('Failed to get publisher websites:', error);
    return NextResponse.json(
      { error: 'Failed to get publisher websites' },
      { status: 500 }
    );
  }
}