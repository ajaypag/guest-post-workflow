import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    
    return NextResponse.json({
      database_url_configured: !!dbUrl,
      database_url_preview: dbUrl ? dbUrl.substring(0, 20) + '...' : 'Not set',
      node_env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}