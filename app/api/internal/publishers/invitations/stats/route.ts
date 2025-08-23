import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishers } from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get statistics for shadow publishers
    const [stats] = await db
      .select({
        totalShadow: sql<number>`count(*)::int`,
        notSent: sql<number>`count(*) filter (where ${publishers.invitationSentAt} is null)::int`,
        sent: sql<number>`count(*) filter (where ${publishers.invitationSentAt} is not null and ${publishers.claimedAt} is null)::int`,
        claimed: sql<number>`count(*) filter (where ${publishers.claimedAt} is not null)::int`,
        sentToday: sql<number>`count(*) filter (where date(${publishers.invitationSentAt}) = current_date)::int`,
        sentThisWeek: sql<number>`count(*) filter (where ${publishers.invitationSentAt} >= current_date - interval '7 days')::int`,
        claimedThisWeek: sql<number>`count(*) filter (where ${publishers.claimedAt} >= current_date - interval '7 days')::int`,
        averageClaimTime: sql<number>`
          avg(
            CASE 
              WHEN ${publishers.claimedAt} IS NOT NULL AND ${publishers.invitationSentAt} IS NOT NULL
              THEN EXTRACT(EPOCH FROM (${publishers.claimedAt} - ${publishers.invitationSentAt})) / 3600
              ELSE NULL
            END
          )::float
        `
      })
      .from(publishers)
      .where(eq(publishers.accountStatus, 'shadow'));

    // Calculate conversion rate
    const conversionRate = stats.sent > 0 
      ? ((stats.claimed / (stats.sent + stats.claimed)) * 100).toFixed(1)
      : '0';

    // Get recent activity
    const recentActivity = await db
      .select({
        date: sql<string>`date(${publishers.invitationSentAt})::text`,
        sent: sql<number>`count(*) filter (where ${publishers.invitationSentAt} is not null)::int`,
        claimed: sql<number>`count(*) filter (where ${publishers.claimedAt} is not null)::int`
      })
      .from(publishers)
      .where(
        and(
          eq(publishers.accountStatus, 'shadow'),
          sql`${publishers.invitationSentAt} >= current_date - interval '30 days'`
        )
      )
      .groupBy(sql`date(${publishers.invitationSentAt})`)
      .orderBy(sql`date(${publishers.invitationSentAt}) desc`)
      .limit(30);

    return NextResponse.json({
      summary: {
        totalShadow: stats.totalShadow,
        notSent: stats.notSent,
        sent: stats.sent,
        claimed: stats.claimed,
        conversionRate: parseFloat(conversionRate),
        sentToday: stats.sentToday,
        sentThisWeek: stats.sentThisWeek,
        claimedThisWeek: stats.claimedThisWeek,
        averageClaimTimeHours: stats.averageClaimTime ? Math.round(stats.averageClaimTime) : null
      },
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching invitation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation statistics' },
      { status: 500 }
    );
  }
}