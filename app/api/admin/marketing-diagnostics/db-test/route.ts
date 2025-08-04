import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Test basic connection
    const result = await db.execute(sql`SELECT NOW() as current_time, version() as pg_version`);
    
    return NextResponse.json({
      connected: true,
      currentTime: result.rows[0]?.current_time,
      pgVersion: result.rows[0]?.pg_version,
      connectionString: process.env.DATABASE_URL ? 'Configured (hidden for security)' : 'NOT CONFIGURED',
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlLength: process.env.DATABASE_URL?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      error: error.message,
      details: error.stack,
      code: error.code,
      connectionString: process.env.DATABASE_URL ? 'Configured but failed' : 'NOT CONFIGURED',
      hasDbUrl: !!process.env.DATABASE_URL,
    });
  }
}