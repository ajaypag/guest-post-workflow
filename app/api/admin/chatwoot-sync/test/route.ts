import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiUrl = process.env.CHATWOOT_API_URL;
    const apiKey = process.env.CHATWOOT_API_KEY;
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;

    if (!apiUrl || !apiKey || !accountId) {
      return NextResponse.json({
        error: 'Chatwoot configuration missing. Please check environment variables.'
      }, { status: 400 });
    }

    // Test API connection
    const response = await fetch(`${apiUrl}/api/v1/accounts/${accountId}`, {
      headers: {
        'api_access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `API request failed: ${response.status} ${response.statusText}`
      }, { status: response.status });
    }

    const account = await response.json();

    // Get inboxes
    const inboxResponse = await fetch(`${apiUrl}/api/v1/accounts/${accountId}/inboxes`, {
      headers: {
        'api_access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const inboxes = inboxResponse.ok ? await inboxResponse.json() : [];

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
      },
      inboxes: inboxes.payload || []
    });
  } catch (error: any) {
    console.error('Chatwoot connection test failed:', error);
    return NextResponse.json({
      error: 'Connection test failed',
      details: error.message
    }, { status: 500 });
  }
}