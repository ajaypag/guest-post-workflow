import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { datetime_from, datetime_to, include_metadata } = await request.json();
    
    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      return NextResponse.json(
        { error: 'DataForSEO credentials not configured' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(
      `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
    ).toString('base64');

    // Prepare request body
    const requestBody = [{
      datetime_from,
      datetime_to,
      limit: 1000,
      include_metadata: include_metadata || false
    }];

    console.log('Fetching DataForSEO task list:', requestBody);

    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/id_list',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DataForSEO API error:', errorText);
      return NextResponse.json(
        { error: `DataForSEO API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`Retrieved ${data.tasks?.[0]?.result?.length || 0} tasks`);

    // Extract tasks from the response
    const tasks = data.tasks?.[0]?.result || [];
    
    return NextResponse.json({ 
      tasks,
      total: tasks.length,
      cost: data.cost || 0
    });

  } catch (error: any) {
    console.error('DataForSEO task list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task list', details: error.message },
      { status: 500 }
    );
  }
}