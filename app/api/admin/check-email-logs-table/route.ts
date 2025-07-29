import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // TODO: Add authentication check when auth system is implemented

    // Check if email_logs table exists
    const tableResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs'
      );
    `) as any;
    
    const tableExists = tableResult[0]?.exists || false;

    if (!tableExists) {
      return NextResponse.json({
        exists: false,
        message: 'Email logs table does not exist'
      });
    }

    // Check indexes
    const indexResult = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'email_logs'
      ORDER BY indexname;
    `) as any;
    
    const indexes = indexResult.map((row: any) => row.indexname);

    // Get email count
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM email_logs`) as any;
    const emailCount = parseInt(countResult[0]?.count || '0');

    return NextResponse.json({
      exists: true,
      emailCount,
      indexes,
      message: `Email logs table exists with ${emailCount} emails logged`
    });
  } catch (error: any) {
    console.error('Check email logs table error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}