import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { datetime_from, datetime_to } = await request.json();
    
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
      limit: 1000,
      datetime_from,
      datetime_to,
      // We can filter by specific functions if needed
      // filtered_function: "dataforseo_labs/google/ranked_keywords/live"
    }];

    console.log('Fetching DataForSEO errors:', requestBody);

    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/errors',
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
    console.log(`Retrieved ${data.tasks?.[0]?.result?.length || 0} errors`);

    // Extract errors from the response
    const errors = data.tasks?.[0]?.result || [];
    
    return NextResponse.json({ 
      errors,
      total: errors.length,
      cost: data.cost || 0
    });

  } catch (error: any) {
    console.error('DataForSEO errors list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch errors list', details: error.message },
      { status: 500 }
    );
  }
}