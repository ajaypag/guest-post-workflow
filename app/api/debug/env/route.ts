import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 20) + '...' || 'Not set',
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER_EXISTS: !!process.env.DB_USER,
      DB_PASSWORD_EXISTS: !!process.env.DB_PASSWORD,
      NEXTAUTH_SECRET_EXISTS: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(envInfo);
  } catch (error) {
    console.error('Environment debug error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}