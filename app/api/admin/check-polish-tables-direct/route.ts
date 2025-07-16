import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Checking polish tables directly...');
    
    // Method 1: Check table existence
    const tablesExistResult = await db.execute(sql`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('polish_sessions', 'polish_sections')
      ORDER BY table_name
    `);
    
    console.log('Tables found:', tablesExistResult);
    
    // Method 2: Try to query the tables directly (will error if they don't exist)
    let canQuerySessions = false;
    let canQuerySections = false;
    let sessionsError = null;
    let sectionsError = null;
    
    try {
      const sessionsTest = await db.execute(sql`SELECT COUNT(*) as count FROM polish_sessions`);
      canQuerySessions = true;
      console.log('polish_sessions query successful:', sessionsTest);
    } catch (error: any) {
      sessionsError = error.message;
      console.error('polish_sessions query failed:', error);
    }
    
    try {
      const sectionsTest = await db.execute(sql`SELECT COUNT(*) as count FROM polish_sections`);
      canQuerySections = true;
      console.log('polish_sections query successful:', sectionsTest);
    } catch (error: any) {
      sectionsError = error.message;
      console.error('polish_sections query failed:', error);
    }
    
    // Method 3: Check column structure if tables exist
    let sessionsColumns = [];
    let sectionsColumns = [];
    
    if (canQuerySessions) {
      const columnsResult = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'polish_sessions'
        ORDER BY ordinal_position
      `);
      sessionsColumns = Array.isArray(columnsResult) ? columnsResult : (columnsResult as any).rows || [];
    }
    
    if (canQuerySections) {
      const columnsResult = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'polish_sections'
        ORDER BY ordinal_position
      `);
      sectionsColumns = Array.isArray(columnsResult) ? columnsResult : (columnsResult as any).rows || [];
    }
    
    return NextResponse.json({
      success: true,
      tablesFound: tablesExistResult,
      queryResults: {
        canQuerySessions,
        canQuerySections,
        sessionsError,
        sectionsError
      },
      columnStructure: {
        polish_sessions: sessionsColumns,
        polish_sections: sectionsColumns
      }
    });
    
  } catch (error: any) {
    console.error('Error checking polish tables:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check polish tables',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}