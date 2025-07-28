import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'tasks';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check for API credentials
    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      return NextResponse.json({ error: 'DataForSEO credentials not configured' }, { status: 500 });
    }

    const auth = Buffer.from(
      `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
    ).toString('base64');

    let apiUrl: string;
    let requestBody: any;

    switch (action) {
      case 'tasks':
        // Get list of all tasks
        apiUrl = 'https://api.dataforseo.com/v3/dataforseo_labs/id_list';
        requestBody = [{
          limit,
          offset,
          datetime_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          datetime_to: new Date().toISOString(),
          include_metadata: true,
          sort: 'datetime_posted,desc' // Sort by most recent first
        }];
        break;

      case 'errors':
        // Get list of errors
        apiUrl = 'https://api.dataforseo.com/v3/dataforseo_labs/errors';
        requestBody = [{
          limit,
          offset,
          datetime_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          datetime_to: new Date().toISOString()
        }];
        break;

      case 'task_details':
        // Get details for a specific task
        const taskId = searchParams.get('task_id');
        if (!taskId) {
          return NextResponse.json({ error: 'task_id parameter required' }, { status: 400 });
        }
        apiUrl = `https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/task_get/${taskId}`;
        requestBody = null; // GET request
        break;

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }

    console.log(`DataForSEO Monitoring - ${action}:`, { apiUrl, requestBody });

    let response;
    if (requestBody) {
      // POST request
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } else {
      // GET request (for task details)
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DataForSEO Monitoring API error:', errorText);
      return NextResponse.json({ 
        error: `DataForSEO API error: ${response.status}`,
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Process and enhance the data
    if (action === 'tasks' && data.tasks?.[0]?.result) {
      // Analyze task data for keyword count patterns
      const tasks = data.tasks[0].result;
      const enhancedTasks = tasks.map((task: any) => {
        // Try to extract keyword count from metadata or data
        let keywordCount = 0;
        let filterInfo = null;
        let taskStatus = 'Unknown';
        let resultCount = 0;

        try {
          // Parse the data field which contains the request payload
          if (task.data) {
            const taskData = typeof task.data === 'string' ? JSON.parse(task.data) : task.data;
            if (taskData && taskData[0]) {
              // Extract filters
              if (taskData[0].filters) {
                filterInfo = taskData[0].filters;
                // Count keyword filters more accurately
                if (Array.isArray(filterInfo)) {
                  // Count all keyword-related filters (including "or" separated ones)
                  const countKeywordFilters = (filters: any[]): number => {
                    let count = 0;
                    for (const filter of filters) {
                      if (Array.isArray(filter) && filter[0] === 'keyword_data.keyword') {
                        count++;
                      }
                    }
                    return count;
                  };
                  keywordCount = countKeywordFilters(filterInfo);
                }
              }
              
              // Check if there's a limit specified
              if (taskData[0].limit) {
                // This is likely a ranked keywords request
              }
            }
          }

          // Check the result for actual data
          if (task.result && Array.isArray(task.result) && task.result[0]) {
            if (task.result[0].items) {
              resultCount = task.result[0].items.length;
            }
            if (task.result[0].total_count !== undefined) {
              // Use total_count if available
            }
          }

          // Determine task status
          if (task.status_code === 20000) {
            taskStatus = 'Success';
          } else if (task.status_code === 40000) {
            taskStatus = 'Error';
          } else {
            taskStatus = `Status ${task.status_code}`;
          }
        } catch (e) {
          console.error('Error parsing task data:', e);
        }

        // Convert to EST timezone
        const toEST = (dateStr: string) => {
          if (!dateStr) return null;
          const date = new Date(dateStr);
          return date.toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }) + ' EST';
        };

        // Try to extract domain from the task data
        let domainInfo = 'Unknown Domain';
        try {
          if (task.data) {
            const taskData = typeof task.data === 'string' ? JSON.parse(task.data) : task.data;
            if (taskData && taskData[0] && taskData[0].target) {
              domainInfo = taskData[0].target;
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }

        return {
          ...task,
          keyword_count: keywordCount,
          filter_info: filterInfo,
          task_status: taskStatus,
          result_count: resultCount,
          datetime_posted_formatted: toEST(task.datetime_posted),
          datetime_done_formatted: toEST(task.datetime_done),
          execution_time: task.time ? `${task.time}s` : null,
          cost_formatted: task.cost ? `$${task.cost.toFixed(4)}` : null,
          domain_info: domainInfo
        };
      });

      return NextResponse.json({
        status: 'success',
        action,
        total_count: data.tasks[0].total_count || tasks.length,
        tasks: enhancedTasks,
        summary: {
          total_tasks: enhancedTasks.length,
          successful_tasks: enhancedTasks.filter((t: any) => t.status_code === 20000).length,
          failed_tasks: enhancedTasks.filter((t: any) => t.status_code !== 20000).length,
          total_cost: enhancedTasks.reduce((sum: number, t: any) => sum + (t.cost || 0), 0).toFixed(4),
          keyword_distribution: enhancedTasks.reduce((acc: any, t: any) => {
            const key = `${t.keyword_count}_keywords`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {})
        }
      });
    }

    // Return raw data for other actions
    return NextResponse.json({
      status: 'success',
      action,
      data
    });

  } catch (error) {
    console.error('DataForSEO monitoring error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}