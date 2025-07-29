import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  console.log('[Debug Email Logs] Starting comprehensive debug...');
  const debug: any = {};
  
  try {
    // 1. Check all tables in public schema
    console.log('[Debug Email Logs] Checking all tables...');
    const allTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `) as any;
    
    debug.allTables = allTables.map((t: any) => t.table_name);
    console.log('[Debug Email Logs] Found tables:', debug.allTables.join(', '));
    
    // 2. Check specifically for email_logs with different approaches
    console.log('[Debug Email Logs] Checking email_logs existence...');
    
    // Method 1: Direct query
    try {
      const directCheck = await db.execute(sql`SELECT 1 FROM email_logs LIMIT 1`);
      debug.directQueryWorks = true;
      console.log('[Debug Email Logs] Direct query succeeded');
    } catch (e: any) {
      debug.directQueryWorks = false;
      debug.directQueryError = e.message;
      console.log('[Debug Email Logs] Direct query failed:', e.message);
    }
    
    // Method 2: pg_tables
    const pgTables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'email_logs'
    `) as any;
    debug.inPgTables = pgTables.length > 0;
    console.log('[Debug Email Logs] In pg_tables:', debug.inPgTables);
    
    // Method 3: Check with LIKE to catch case issues
    const likeCheck = await db.execute(sql`
      SELECT table_name, table_schema
      FROM information_schema.tables 
      WHERE table_name LIKE '%email%'
    `) as any;
    debug.tablesWithEmail = likeCheck.map((t: any) => ({
      name: t.table_name,
      schema: t.table_schema
    }));
    console.log('[Debug Email Logs] Tables with "email":', JSON.stringify(debug.tablesWithEmail));
    
    // 4. Check current schema
    const currentSchema = await db.execute(sql`SELECT current_schema()`) as any;
    debug.currentSchema = currentSchema[0]?.current_schema;
    console.log('[Debug Email Logs] Current schema:', debug.currentSchema);
    
    // 5. Check search path
    const searchPath = await db.execute(sql`SHOW search_path`) as any;
    debug.searchPath = searchPath[0]?.search_path;
    console.log('[Debug Email Logs] Search path:', debug.searchPath);
    
    // 6. If table exists, get its structure
    if (debug.directQueryWorks || debug.inPgTables) {
      try {
        const columns = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'email_logs'
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `) as any;
        debug.columns = columns.map((c: any) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable
        }));
        console.log('[Debug Email Logs] Columns found:', debug.columns.length);
      } catch (e: any) {
        debug.columnsError = e.message;
      }
    }
    
    return NextResponse.json({
      success: true,
      debug,
      summary: {
        tableExists: debug.directQueryWorks || debug.inPgTables,
        tableCount: debug.allTables?.length || 0,
        hasEmailRelatedTables: debug.tablesWithEmail?.length > 0
      }
    });
    
  } catch (error: any) {
    console.error('[Debug Email Logs] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      debug
    }, { status: 500 });
  }
}