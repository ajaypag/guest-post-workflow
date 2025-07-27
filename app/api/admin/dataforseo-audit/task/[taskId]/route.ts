import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    
    // Try to fetch logged data from our database
    const logData = await db.execute(sql`
      SELECT 
        l.*,
        bd.domain as domain_name,
        c.name as client_name
      FROM dataforseo_api_logs l
      LEFT JOIN bulk_analysis_domains bd ON l.domain_id = bd.id
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE l.task_id = ${taskId}
      LIMIT 1
    `).catch(() => null);

    if (logData?.rows?.[0]) {
      const log = logData.rows[0];
      return NextResponse.json({ 
        taskId,
        payload: {
          request: log.request_payload,
          response: log.response_data,
          metadata: {
            domain: log.domain_name || log.domain,
            client: log.client_name,
            endpoint: log.endpoint,
            requestedAt: log.requested_at,
            respondedAt: log.responded_at,
            cost: log.cost,
            keywordCount: log.keyword_count,
            locationCode: log.location_code,
            languageCode: log.language_code,
            requestType: log.request_type,
            responseStatus: log.response_status,
            errorMessage: log.error_message
          }
        }
      });
    }
    
    // If no logged data found
    const payload = {
      note: "No logged data found for this task ID.",
      taskId: taskId,
      suggestion: "This might be a task from before logging was implemented. New API calls will be logged automatically."
    };

    return NextResponse.json({ 
      taskId,
      payload
    });

  } catch (error: any) {
    console.error('Task details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task details', details: error.message },
      { status: 500 }
    );
  }
}