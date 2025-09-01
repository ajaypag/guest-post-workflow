import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql, eq } from 'drizzle-orm';

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

    const { websiteId, strategy, customOfferingId } = await request.json();

    if (!websiteId || !strategy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['min_price', 'max_price', 'custom'].includes(strategy)) {
      return NextResponse.json({ error: 'Invalid strategy' }, { status: 400 });
    }

    if (strategy === 'custom' && !customOfferingId) {
      return NextResponse.json({ error: 'Custom offering ID required for custom strategy' }, { status: 400 });
    }

    // Update the website strategy
    await db
      .update(websites)
      .set({
        pricingStrategy: strategy,
        customOfferingId: strategy === 'custom' ? customOfferingId : null,
      })
      .where(eq(websites.id, websiteId));

    // Recalculate the price using the database function
    const result = await db.execute(sql`
      SELECT calculate_and_update_guest_post_cost(
        ${websiteId}::UUID, 
        ${strategy}::VARCHAR,
        ${strategy === 'custom' ? customOfferingId : null}::UUID
      ) as new_price
    `);

    const newPrice = result.rows[0]?.new_price;

    // Get updated website info
    const updatedWebsite = await db.execute(sql`
      SELECT 
        w.id,
        w.domain,
        w.guest_post_cost,
        w.pricing_strategy,
        w.custom_offering_id,
        po.offering_name as custom_offering_name,
        po.base_price as custom_offering_price
      FROM websites w
      LEFT JOIN publisher_offerings po ON po.id = w.custom_offering_id
      WHERE w.id = ${websiteId}::UUID
    `);

    return NextResponse.json({
      success: true,
      website: updatedWebsite.rows[0],
      newPrice: newPrice
    });

  } catch (error) {
    console.error('Error updating website strategy:', error);
    return NextResponse.json(
      { error: 'Failed to update website strategy' },
      { status: 500 }
    );
  }
}