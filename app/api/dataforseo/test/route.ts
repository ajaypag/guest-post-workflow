import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('DataForSEO test endpoint called');
  
  try {
    // Check environment variables
    const hasLogin = !!process.env.DATAFORSEO_LOGIN;
    const hasPassword = !!process.env.DATAFORSEO_PASSWORD;
    
    console.log('Environment check:', { hasLogin, hasPassword });
    
    if (!hasLogin || !hasPassword) {
      return NextResponse.json({
        success: false,
        error: 'DataForSEO credentials not configured',
        credentials: { hasLogin, hasPassword }
      }, { status: 500 });
    }
    
    // Test API connection with a simple request
    const auth = Buffer.from(
      `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
    ).toString('base64');
    
    console.log('Testing DataForSEO API connection...');
    
    // Test with a simple request for locations
    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/locations_and_languages',
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('DataForSEO test response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('DataForSEO test error:', errorText);
      
      return NextResponse.json({
        success: false,
        error: 'DataForSEO API test failed',
        status: response.status,
        details: errorText
      }, { status: 500 });
    }
    
    const data = await response.json();
    console.log('DataForSEO test successful');
    
    return NextResponse.json({
      success: true,
      message: 'DataForSEO connection successful',
      apiStatus: response.status,
      tasksCount: data.tasks?.length || 0
    });
    
  } catch (error: any) {
    console.error('DataForSEO test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to test DataForSEO connection',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}