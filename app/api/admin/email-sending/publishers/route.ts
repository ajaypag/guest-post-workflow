import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

// For testing purposes - bypass auth in local development
const isLocalDevelopment = process.env.NODE_ENV === 'development' && 
  (process.env.NEXTAUTH_URL?.includes('localhost') || !process.env.NEXTAUTH_URL);
import { publishers } from '@/lib/db/schema';
import { eq, or, like } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Skip auth check for local testing
  if (!isLocalDevelopment) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Get test publishers (either explicitly test or shadow publishers)
    const testPublishers = await db.query.publishers.findMany({
      where: or(
        eq(publishers.source, 'test'),
        eq(publishers.accountStatus, 'shadow')
      ),
      limit: 20,
      orderBy: (publishers, { desc }) => [desc(publishers.createdAt)]
    });

    // Get website counts for each publisher
    const publishersWithCounts = await Promise.all(
      testPublishers.map(async (publisher) => {
        // For now, return a mock count since we need to join with publisher websites
        return {
          id: publisher.id,
          companyName: publisher.companyName || 'Unknown Company',
          email: publisher.email,
          contactName: publisher.contactName || 'Unknown',
          websiteCount: Math.floor(Math.random() * 5) + 1 // Mock for now
        };
      })
    );

    return NextResponse.json({
      success: true,
      publishers: publishersWithCounts
    });

  } catch (error: any) {
    console.error('[EMAIL_TEST] Error loading publishers:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to load publishers',
      publishers: []
    }, { status: 500 });
  }
}