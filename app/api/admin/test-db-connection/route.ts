import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connectivity
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('Database connection successful:', result);
    
    // Test if we can see existing tables
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = (tablesResult.rows || tablesResult).map((row: any) => row.table_name);
    console.log('Existing tables:', tables);
    
    // Test if we can create a simple test table
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS test_table_temp (
          id SERIAL PRIMARY KEY,
          test_data TEXT
        )
      `);
      
      await db.execute(sql`DROP TABLE IF EXISTS test_table_temp`);
      console.log('Table creation test: SUCCESS');
      
    } catch (createError) {
      console.error('Table creation test failed:', createError);
      return NextResponse.json({
        success: false,
        error: 'Failed table creation test',
        details: createError instanceof Error ? createError.message : 'Unknown error',
        tables,
        dbConnected: true
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database connection and permissions verified',
      tables,
      dbConnected: true,
      canCreateTables: true
    });

  } catch (error) {
    console.error('Database connection test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        dbConnected: false
      },
      { status: 500 }
    );
  }
}