import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { workflows } from '@/lib/db/schema';
import { websites } from '@/lib/db/websiteSchema';
import { count } from 'drizzle-orm';

export async function GET() {
  try {
    // Try to get real data from database
    const accountCountResult = await db.select({ count: count() }).from(accounts);
    const activeAccounts = accountCountResult[0]?.count || 0;

    const workflowCountResult = await db.select({ count: count() }).from(workflows);
    const totalWorkflows = workflowCountResult[0]?.count || 0;

    const websiteCountResult = await db.select({ count: count() }).from(websites);
    const totalWebsites = websiteCountResult[0]?.count || 0;

    return NextResponse.json({
      activeAccounts,
      totalWorkflows,
      totalWebsites,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching marketing metrics:', error);
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 500 }
    );
  }
}