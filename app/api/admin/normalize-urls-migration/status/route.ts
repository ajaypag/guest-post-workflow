import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPages } from '@/lib/db/schema';
import { sql, isNull } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total count of target pages
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(targetPages);
    
    const totalPages = Number(totalResult[0]?.count || 0);

    // Get count of pages without normalized URLs
    const withoutNormalizedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(targetPages)
      .where(isNull(targetPages.normalizedUrl));
    
    const pagesWithoutNormalizedUrl = Number(withoutNormalizedResult[0]?.count || 0);

    return NextResponse.json({
      totalPages,
      pagesWithoutNormalizedUrl,
      isComplete: pagesWithoutNormalizedUrl === 0,
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    
    // Check if it's a column not found error
    if (error instanceof Error && error.message.includes('column')) {
      return NextResponse.json(
        { 
          error: 'The normalized_url column does not exist. Please run the schema migration first.',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to check migration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}