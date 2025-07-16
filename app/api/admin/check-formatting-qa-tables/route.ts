import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Checking for formatting QA tables...');
    
    // Check if tables exist
    const tableCheckQuery = sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'formatting_qa_sessions'
      ) as sessions_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'formatting_qa_checks'
      ) as checks_exists
    `;
    
    const result = await db.execute(tableCheckQuery);
    const exists = result.rows[0].sessions_exists && result.rows[0].checks_exists;
    
    if (exists) {
      // Get table sizes
      const sizeQuery = sql`
        SELECT 
          (SELECT COUNT(*) FROM formatting_qa_sessions) as session_count,
          (SELECT COUNT(*) FROM formatting_qa_checks) as check_count
      `;
      
      const sizeResult = await db.execute(sizeQuery);
      
      return NextResponse.json({
        exists: true,
        message: 'Formatting QA tables exist',
        details: {
          sessions_exists: result.rows[0].sessions_exists,
          checks_exists: result.rows[0].checks_exists,
          session_count: sizeResult.rows[0].session_count,
          check_count: sizeResult.rows[0].check_count
        }
      });
    } else {
      return NextResponse.json({
        exists: false,
        message: 'Formatting QA tables do not exist',
        details: {
          sessions_exists: result.rows[0].sessions_exists,
          checks_exists: result.rows[0].checks_exists
        }
      });
    }
  } catch (error: any) {
    console.error('Error checking formatting QA tables:', error);
    return NextResponse.json({
      error: 'Failed to check formatting QA tables',
      details: error.message
    }, { status: 500 });
  }
}