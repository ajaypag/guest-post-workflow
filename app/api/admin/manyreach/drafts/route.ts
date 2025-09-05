import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { requireInternalUser } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100'); // Increased default
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const withOffers = searchParams.get('withOffers') === 'true';
    const withPricing = searchParams.get('withPricing') === 'true';
    const offerType = searchParams.get('offerType') || 'all';
    const priceRange = searchParams.get('priceRange') || 'all';
    const minPrice = parseInt(searchParams.get('minPrice') || '0');
    const maxPrice = parseInt(searchParams.get('maxPrice') || '10000');

    // Build query
    let query = sql`
      SELECT 
        d.id,
        d.email_log_id,
        d.parsed_data,
        d.edited_data,
        d.status,
        d.review_notes,
        d.created_at,
        d.reviewed_at,
        d.publisher_id,
        d.website_id,
        e.email_from,
        e.email_subject,
        e.campaign_name,
        e.received_at,
        e.raw_content,
        e.html_content
      FROM publisher_drafts d
      INNER JOIN email_processing_logs e ON d.email_log_id = e.id
    `;

    // Build WHERE conditions
    const conditions = [];
    if (status !== 'all') {
      conditions.push(sql`d.status = ${status}`);
    }
    if (search) {
      conditions.push(sql`(
        e.email_from ILIKE ${'%' + search + '%'} OR 
        e.email_subject ILIKE ${'%' + search + '%'} OR
        e.campaign_name ILIKE ${'%' + search + '%'}
      )`);
    }

    // Filter for drafts with offers
    if (withOffers) {
      conditions.push(sql`(
        COALESCE(d.edited_data->>'hasOffer', d.parsed_data->>'hasOffer')::boolean = true
      )`);
    }

    // Filter for drafts with pricing
    if (withPricing) {
      conditions.push(sql`(
        (COALESCE(d.edited_data->'offerings', d.parsed_data->'offerings') IS NOT NULL AND 
         jsonb_array_length(COALESCE(d.edited_data->'offerings', d.parsed_data->'offerings')) > 0 AND
         EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE(d.edited_data->'offerings', d.parsed_data->'offerings')) AS offering
           WHERE (offering->>'basePrice')::numeric > 0
         ))
      )`);
    }

    // Filter by offer type
    if (offerType !== 'all') {
      const offerTypeMap: Record<string, string> = {
        'guest_post': 'Guest Post',
        'link_insertion': 'Link Insertion',
        'link_exchange': 'Link Exchange'
      };
      const mappedType = offerTypeMap[offerType];
      if (mappedType) {
        conditions.push(sql`(
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(d.edited_data->'offerings', d.parsed_data->'offerings')) AS offering
            WHERE offering->>'type' = ${mappedType}
          )
        )`);
      }
    }

    // Filter by price range
    if (priceRange !== 'all' || (minPrice > 0 || maxPrice < 10000)) {
      let priceCondition;
      if (priceRange !== 'all') {
        const rangeMap: Record<string, [number, number]> = {
          '0-100': [0, 100],
          '100-500': [100, 500],
          '500-1000': [500, 1000],
          '1000+': [1000, 999999]
        };
        const [rangeMin, rangeMax] = rangeMap[priceRange] || [minPrice, maxPrice];
        priceCondition = sql`(
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(d.edited_data->'offerings', d.parsed_data->'offerings')) AS offering
            WHERE (offering->>'basePrice')::numeric >= ${rangeMin} AND (offering->>'basePrice')::numeric <= ${rangeMax}
          )
        )`;
      } else {
        priceCondition = sql`(
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(d.edited_data->'offerings', d.parsed_data->'offerings')) AS offering
            WHERE (offering->>'basePrice')::numeric >= ${minPrice} AND (offering->>'basePrice')::numeric <= ${maxPrice}
          )
        )`;
      }
      conditions.push(priceCondition);
    }

    if (conditions.length > 0) {
      query = sql`${query} WHERE ${conditions.reduce((acc, cond, i) => 
        i === 0 ? cond : sql`${acc} AND ${cond}`
      )}`;
    }

    query = sql`${query} ORDER BY d.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const draftsResult = await db.execute(query);
    const drafts = (draftsResult as any).rows || [];

    // Get total count with same filtering
    let countQuery = sql`
      SELECT COUNT(*) as total 
      FROM publisher_drafts d
      INNER JOIN email_processing_logs e ON d.email_log_id = e.id
    `;

    if (conditions.length > 0) {
      countQuery = sql`${countQuery} WHERE ${conditions.reduce((acc, cond, i) => 
        i === 0 ? cond : sql`${acc} AND ${cond}`
      )}`;
    }
    
    const countResult = await db.execute(countQuery);
    const total = (countResult as any).rows?.[0]?.total || 0;

    return NextResponse.json({
      drafts,
      total,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { draftId, editedData, status, reviewNotes } = await request.json();

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    // Update draft - handle undefined values properly
    const updateQuery = sql`
      UPDATE publisher_drafts
      SET 
        edited_data = ${editedData ? JSON.stringify(editedData) : null}::jsonb,
        status = COALESCE(${status || null}, status),
        review_notes = COALESCE(${reviewNotes || null}, review_notes),
        updated_at = NOW()
      WHERE id = ${draftId}
      RETURNING *
    `;

    const updateResult = await db.execute(updateQuery);
    const updated = (updateResult as any).rows?.[0];

    return NextResponse.json({ 
      success: true,
      draft: updated 
    });

  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    // Delete draft
    const deleteQuery = sql`
      DELETE FROM publisher_drafts
      WHERE id = ${draftId}
      RETURNING id
    `;

    const deleteResult = await db.execute(deleteQuery);
    const deleted = (deleteResult as any).rows?.[0];

    if (!deleted) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Draft deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}