import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.role === 'admin' || (session as any).role === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { websiteIds, strategy } = await request.json();

    if (!websiteIds || websiteIds.length === 0) {
      return NextResponse.json({ error: 'No websites selected' }, { status: 400 });
    }

    if (!strategy || !['min_price', 'max_price'].includes(strategy)) {
      return NextResponse.json({ error: 'Invalid strategy. Must be min_price or max_price' }, { status: 400 });
    }

    // Update pricing strategy for selected websites
    await db
      .update(websites)
      .set({
        pricingStrategy: strategy,
      })
      .where(inArray(websites.id, websiteIds));

    // Recalculate prices for updated websites using the database function
    for (const websiteId of websiteIds) {
      await db.execute(sql`
        SELECT calculate_and_update_guest_post_cost(
          ${websiteId}::UUID, 
          ${strategy}::VARCHAR
        )
      `);
    }

    return NextResponse.json({
      success: true,
      updated: websiteIds.length,
      strategy: strategy
    });

  } catch (error) {
    console.error('Error updating websites:', error);
    return NextResponse.json(
      { error: 'Failed to update websites' },
      { status: 500 }
    );
  }
}