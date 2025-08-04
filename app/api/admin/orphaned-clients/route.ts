import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients, targetPages } from '@/lib/db/schema';
import { eq, isNull, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get all clients where accountId is NULL
    const orphanedClients = await db
      .select({
        id: clients.id,
        name: clients.name,
        website: clients.website,
        description: clients.description,
        createdAt: clients.createdAt,
        targetPageCount: sql<number>`COUNT(DISTINCT ${targetPages.id})`.as('targetPageCount')
      })
      .from(clients)
      .leftJoin(targetPages, eq(targetPages.clientId, clients.id))
      .where(isNull(sql`${clients}.account_id`))
      .groupBy(clients.id, clients.name, clients.website, clients.description, clients.createdAt);

    return NextResponse.json({ 
      clients: orphanedClients,
      count: orphanedClients.length 
    });
  } catch (error) {
    console.error('Error fetching orphaned clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orphaned clients' },
      { status: 500 }
    );
  }
}