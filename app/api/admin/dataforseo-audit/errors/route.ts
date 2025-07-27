import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { datetime_from, datetime_to } = await request.json();
    
    // Fetch logged errors from our database
    const result = await db.execute(sql`
      SELECT 
        l.*,
        bd.domain as domain_name,
        c.name as client_name
      FROM dataforseo_api_logs l
      LEFT JOIN bulk_analysis_domains bd ON l.domain_id = bd.id
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE l.requested_at >= ${datetime_from}::timestamp
        AND l.requested_at <= ${datetime_to}::timestamp
        AND (l.error_message IS NOT NULL OR l.response_status != 200)
      ORDER BY l.requested_at DESC
      LIMIT 1000
    `).catch((err) => {
      console.error('Database query error:', err);
      return null;
    });

    if (!result || !result.rows) {
      return NextResponse.json({ 
        errors: [],
        total: 0,
        cost: 0,
        error: 'Unable to fetch logged errors'
      });
    }

    // Transform database records to match the expected error format
    const errors = result.rows.map((row: any) => ({
      id: row.task_id || row.id,
      datetime: row.requested_at,
      function: 'dataforseo_labs/google/ranked_keywords/live',
      error_code: row.response_status || 40000,
      error_message: row.error_message || `HTTP ${row.response_status} Error`,
      http_url: row.endpoint,
      http_method: 'POST',
      http_code: row.response_status || 500,
      http_response: row.error_message || 'Request failed'
    }));
    
    return NextResponse.json({ 
      errors,
      total: errors.length,
      cost: 0
    });

  } catch (error: any) {
    console.error('Failed to fetch logged errors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch errors list', details: error.message },
      { status: 500 }
    );
  }
}