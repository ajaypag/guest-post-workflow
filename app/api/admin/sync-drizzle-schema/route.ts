import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';

export async function POST() {
  try {
    console.log('🔄 Starting Drizzle schema synchronization...');

    // Test basic connection first
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection verified');

    // Check current outline_sessions columns
    const columnsResult = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'outline_sessions' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    const currentColumns = columnsResult.rows.map((row: any) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      default: row.column_default
    }));

    console.log(`📊 Found ${currentColumns.length} columns in outline_sessions table`);

    // Test a simple query to the outline_sessions table
    try {
      const testQuery = await db.execute(sql`
        SELECT id, workflow_id, status, is_active, last_sequence_number, connection_status 
        FROM outline_sessions 
        LIMIT 1
      `);
      console.log('✅ Query test successful - schema appears to be in sync');
      
      return NextResponse.json({
        success: true,
        message: 'Drizzle schema is synchronized with database',
        details: {
          connectionTest: 'passed',
          queryTest: 'passed',
          columnsFound: currentColumns.length,
          sampleColumns: currentColumns.slice(0, 10) // Show first 10 columns
        },
        currentColumns
      });

    } catch (queryError: any) {
      console.error('❌ Query test failed:', queryError);
      
      return NextResponse.json({
        success: false,
        error: 'Schema query test failed',
        details: {
          connectionTest: 'passed',
          queryTest: 'failed',
          queryError: queryError.message,
          columnsFound: currentColumns.length
        },
        currentColumns,
        recommendation: 'The database schema may not match the Drizzle ORM definition. Consider running a schema migration.'
      });
    }

  } catch (error: any) {
    console.error('❌ Drizzle schema sync failed:', error);
    
    return NextResponse.json({
      success: false,
      error: `Schema sync failed: ${error.message}`,
      details: error,
      recommendation: 'Check database connection and table existence'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Just run diagnostics without making changes
    const columnsResult = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'outline_sessions' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    const columns = columnsResult.rows;
    
    const streamingColumns = [
      'last_sequence_number',
      'connection_status', 
      'stream_started_at',
      'partial_content'
    ];

    const missingStreamingColumns = streamingColumns.filter(col => 
      !columns.some((dbCol: any) => dbCol.column_name === col)
    );

    const presentStreamingColumns = streamingColumns.filter(col => 
      columns.some((dbCol: any) => dbCol.column_name === col)
    );

    return NextResponse.json({
      success: true,
      analysis: {
        totalColumns: columns.length,
        streamingColumnsPresent: presentStreamingColumns,
        streamingColumnsMissing: missingStreamingColumns,
        schemaInSync: missingStreamingColumns.length === 0
      },
      allColumns: columns.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES'
      }))
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}