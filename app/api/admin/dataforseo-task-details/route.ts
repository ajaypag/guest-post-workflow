import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');

    if (!taskId) {
      return NextResponse.json({ error: 'task_id parameter required' }, { status: 400 });
    }

    // Check for API credentials
    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      return NextResponse.json({ error: 'DataForSEO credentials not configured' }, { status: 500 });
    }

    const auth = Buffer.from(
      `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
    ).toString('base64');

    // Try multiple endpoints to get task details
    const endpoints = [
      {
        name: 'ranked_keywords',
        url: `https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/task_get/${taskId}`
      },
      {
        name: 'keyword_suggestions',
        url: `https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/task_get/${taskId}`
      },
      {
        name: 'related_keywords',
        url: `https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/task_get/${taskId}`
      }
    ];

    let successfulResponse = null;
    let errors = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying ${endpoint.name} endpoint for task ${taskId}`);
        
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.tasks?.[0]?.status_code === 20000) {
          successfulResponse = {
            endpoint: endpoint.name,
            data: data.tasks[0]
          };
          break;
        } else {
          errors.push({
            endpoint: endpoint.name,
            status: response.status,
            error: data.tasks?.[0]?.status_message || 'Unknown error'
          });
        }
      } catch (error) {
        errors.push({
          endpoint: endpoint.name,
          error: error instanceof Error ? error.message : 'Request failed'
        });
      }
    }

    if (successfulResponse) {
      // Parse and enhance the response
      const task = successfulResponse.data;
      const result = task.result?.[0] || {};
      
      // Extract useful information
      const enhanced = {
        task_id: taskId,
        endpoint_type: successfulResponse.endpoint,
        status: task.status_code === 20000 ? 'Success' : 'Failed',
        status_code: task.status_code,
        status_message: task.status_message,
        cost: task.cost,
        result_count: result.items?.length || 0,
        total_count: result.total_count || 0,
        datetime_posted: task.datetime_posted,
        datetime_done: task.datetime_done,
        execution_time: task.time,
        
        // Request details
        request_data: task.data,
        
        // Results summary
        results_summary: {
          items_returned: result.items?.length || 0,
          total_available: result.total_count || 0,
          sample_results: result.items?.slice(0, 5).map((item: any) => ({
            keyword: item.keyword_data?.keyword,
            search_volume: item.keyword_data?.keyword_info?.search_volume,
            competition: item.keyword_data?.keyword_info?.competition,
            cpc: item.keyword_data?.keyword_info?.cpc,
            position: item.ranked_serp_element?.serp_item?.rank_absolute,
            url: item.ranked_serp_element?.serp_item?.url
          }))
        }
      };

      return NextResponse.json({
        status: 'success',
        task_details: enhanced
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Could not retrieve task details',
        task_id: taskId,
        errors: errors
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Task details error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}