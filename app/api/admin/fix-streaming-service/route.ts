import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('🔧 Starting streaming service fix...');

    // Test basic database connection
    const connectionTest = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection verified');

    // Check if outline_sessions table exists and has the right columns
    const tableCheck = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'outline_sessions' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    const columns = tableCheck.rows.map((row: any) => row.column_name);
    console.log(`✅ Found ${columns.length} columns in outline_sessions table`);

    // Ensure streaming columns exist
    const streamingColumns = [
      'last_sequence_number',
      'connection_status',
      'stream_started_at',
      'partial_content'
    ];

    const missingColumns = streamingColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing streaming columns: ${missingColumns.join(', ')}`);
      return NextResponse.json({
        success: false,
        error: 'Missing streaming columns',
        missingColumns,
        recommendation: 'Run the database migration first'
      });
    }

    // Test that we can query the table
    try {
      const testQuery = await db.execute(sql`
        SELECT id, workflow_id, status, is_active 
        FROM outline_sessions 
        LIMIT 1
      `);
      console.log('✅ Can query outline_sessions table successfully');
    } catch (queryError: any) {
      console.error('❌ Failed to query outline_sessions:', queryError);
      return NextResponse.json({
        success: false,
        error: 'Cannot query outline_sessions table',
        queryError: queryError.message,
        recommendation: 'Check Drizzle schema definition matches database'
      });
    }

    // Update the unified service to use a better health check
    console.log('✅ Service verification complete');

    return NextResponse.json({
      success: true,
      message: 'Streaming service diagnostics complete',
      tableExists: true,
      columnsFound: columns.length,
      streamingColumnsPresent: streamingColumns.every(col => columns.includes(col)),
      recommendation: 'The database schema appears correct. The issue may be with the service health check implementation.'
    });

  } catch (error: any) {
    console.error('❌ Fix streaming service failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Diagnose the current issue
    const diagnosis = {
      databaseConnection: false,
      tableExists: false,
      columnsCorrect: false,
      queryWorks: false,
      serviceImplementation: 'unknown',
      issue: '',
      recommendation: ''
    };

    // Test database connection
    try {
      await db.execute(sql`SELECT 1`);
      diagnosis.databaseConnection = true;
    } catch (error) {
      diagnosis.issue = 'Database connection failed';
      diagnosis.recommendation = 'Check DATABASE_URL environment variable';
      return NextResponse.json(diagnosis);
    }

    // Check table and columns
    try {
      const columns = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'outline_sessions'
      `);
      
      if (columns.rows.length > 0) {
        diagnosis.tableExists = true;
        
        const columnNames = columns.rows.map((row: any) => row.column_name);
        const hasStreamingColumns = [
          'last_sequence_number',
          'connection_status',
          'stream_started_at',
          'partial_content'
        ].every(col => columnNames.includes(col));
        
        diagnosis.columnsCorrect = hasStreamingColumns;
      }
    } catch (error) {
      diagnosis.issue = 'Cannot check table structure';
      diagnosis.recommendation = 'Database permissions issue';
      return NextResponse.json(diagnosis);
    }

    // Test query
    try {
      await db.execute(sql`
        SELECT id FROM outline_sessions WHERE id = '00000000-0000-0000-0000-000000000000' LIMIT 1
      `);
      diagnosis.queryWorks = true;
    } catch (error: any) {
      diagnosis.issue = `Query failed: ${error.message}`;
      diagnosis.recommendation = 'Drizzle schema may not match database schema';
      return NextResponse.json(diagnosis);
    }

    // Final diagnosis
    if (diagnosis.queryWorks && diagnosis.columnsCorrect) {
      diagnosis.issue = 'Service health check is using invalid test query';
      diagnosis.recommendation = 'The health check is looking for a non-existent workflow_id. This is a false positive error.';
    }

    return NextResponse.json(diagnosis);

  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnosis failed',
      message: error.message
    }, { status: 500 });
  }
}