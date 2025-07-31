import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  console.log('[Check Email Logs Table] Starting check...');
  
  try {
    // TODO: Add authentication check when auth system is implemented

    // Check if email_logs table exists
    const tableResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs'
      ) as exists
    `) as any;
    
    // Handle both array and object with rows property
    const results = Array.isArray(tableResult) ? tableResult : (tableResult.rows || []);
    const tableExists = results[0]?.exists || false;

    console.log('[Check Email Logs Table] Table exists:', tableExists);
    
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
    
    // Handle both array and object with rows property
    const indexRows = Array.isArray(indexResult) ? indexResult : (indexResult.rows || []);
    const indexes = indexRows.map((row: any) => row.indexname);

    // Get email count
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM email_logs`) as any;
    const countRows = Array.isArray(countResult) ? countResult : (countResult.rows || []);
    const emailCount = parseInt(countRows[0]?.count || '0');
    
    console.log('[Check Email Logs Table] Email count:', emailCount);
    console.log('[Check Email Logs Table] Indexes found:', indexes.length);

    return NextResponse.json({
      exists: true,
      emailCount,
      indexes,
      message: `Email logs table exists with ${emailCount} emails logged`
    });
  } catch (error: any) {
    console.error('[Check Email Logs Table] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}