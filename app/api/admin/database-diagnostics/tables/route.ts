import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Fetching all database tables...');
    
    // Get all tables in the public schema
    const tablesResult = await db.execute(sql`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    // Get table sizes and row counts
    const tableStats = [];
    const tablesArray = tablesResult as unknown as any[];
    for (const table of tablesArray) {
      try {
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${table.table_name}"`));
        const sizeResult = await db.execute(sql.raw(`
          SELECT pg_size_pretty(pg_total_relation_size('${table.table_name}')) as size
        `));
        
        tableStats.push({
          name: table.table_name,
          type: table.table_type,
          rowCount: (countResult as any)[0]?.count || 0,
          size: (sizeResult as any)[0]?.size || 'Unknown'
        });
      } catch (error) {
        tableStats.push({
          name: table.table_name,
          type: table.table_type,
          rowCount: 'Error',
          size: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('Found tables:', tableStats.length);

    return NextResponse.json({
      success: true,
      totalTables: tableStats.length,
      tables: tableStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error listing database tables:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : error
    }, { status: 500 });
  }
}