import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { datetime_from, datetime_to, include_metadata } = await request.json();
    
    // Fetch logged tasks from our database instead of DataForSEO API
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
      ORDER BY l.requested_at DESC
      LIMIT 1000
    `).catch((err) => {
      console.error('Database query error:', err);
      return null;
    });

    if (!result || !result.rows) {
      return NextResponse.json({ 
        tasks: [],
        total: 0,
        cost: 0,
        error: 'Unable to fetch logged tasks'
      });
    }

    // Transform database records to match the expected format
    const tasks = result.rows.map((row: any) => ({
      id: row.task_id || row.id,
      url: row.domain || 'N/A',
      datetime_posted: row.requested_at,
      datetime_done: row.responded_at || row.requested_at,
      status_code: row.response_status || (row.error_message ? 40000 : 20000),
      status_message: row.error_message || 'Success',
      cost: parseFloat(row.cost || '0'),
      metadata: {
        api: 'dataforseo_labs',
        function: 'ranked_keywords',
        se: 'google',
        language: row.language_code || 'en',
        location: row.location_code ? `Location Code: ${row.location_code}` : 'United States',
        domain: row.domain_name || row.domain,
        client: row.client_name,
        keyword_count: row.keyword_count,
        request_type: row.request_type
      }
    }));

    // Calculate total cost
    const totalCost = tasks.reduce((sum, task) => sum + task.cost, 0);
    
    return NextResponse.json({ 
      tasks,
      total: tasks.length,
      cost: totalCost
    });

  } catch (error: any) {
    console.error('Failed to fetch logged tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task list', details: error.message },
      { status: 500 }
    );
  }
}