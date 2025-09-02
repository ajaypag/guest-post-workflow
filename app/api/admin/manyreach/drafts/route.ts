import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper auth check
    // For now, allow access for testing

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100'); // Increased default
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

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

    if (conditions.length > 0) {
      query = sql`${query} WHERE ${conditions.reduce((acc, cond, i) => 
        i === 0 ? cond : sql`${acc} AND ${cond}`
      )}`;
    }

    query = sql`${query} ORDER BY d.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const draftsResult = await db.execute(query);
    const drafts = (draftsResult as any).rows || [];

    // Get total count
    const countQuery = status === 'all' 
      ? sql`SELECT COUNT(*) as total FROM publisher_drafts`
      : sql`SELECT COUNT(*) as total FROM publisher_drafts WHERE status = ${status}`;
    
    const countResult = await db.execute(countQuery);
    const total = (countResult as any)[0]?.total || 0;

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
    // TODO: Add proper auth check
    // For now, allow access for testing

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