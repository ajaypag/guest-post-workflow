import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers, websites } from '@/lib/db/schema';
import { publisherWebsites } from '@/lib/db/accountSchema';
import { eq, and, isNull, desc, like, or, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      eq(publishers.accountStatus, 'shadow')
    ];

    // Add status filter
    if (status === 'not_sent') {
      conditions.push(isNull(publishers.invitationSentAt));
    } else if (status === 'sent') {
      conditions.push(sql`${publishers.invitationSentAt} IS NOT NULL AND ${publishers.claimedAt} IS NULL`);
    } else if (status === 'claimed') {
      conditions.push(sql`${publishers.claimedAt} IS NOT NULL`);
    }

    // Add search filter
    if (search) {
      const searchCondition = or(
        like(publishers.email, `%${search}%`),
        like(publishers.companyName, `%${search}%`),
        like(publishers.contactName, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(publishers)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get publishers with website counts
    const shadowPublishers = await db
      .select({
        id: publishers.id,
        email: publishers.email,
        contactName: publishers.contactName,
        companyName: publishers.companyName,
        source: publishers.source,
        invitationSentAt: publishers.invitationSentAt,
        claimedAt: publishers.claimedAt,
        createdAt: publishers.createdAt,
        websiteCount: sql<number>`(
          SELECT COUNT(DISTINCT w.id)::int
          FROM ${publisherWebsites} pw
          JOIN ${websites} w ON w.id = pw.website_id
          WHERE pw.publisher_id = ${publishers}.id
        )`
      })
      .from(publishers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(publishers.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      publishers: shadowPublishers,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching shadow publishers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shadow publishers' },
      { status: 500 }
    );
  }
}