import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if columns exist
    const checkQuery = sql`
      SELECT 
        column_name,
        data_type,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN ('client_type', 'converted_from_prospect_at', 'conversion_notes')
    `;
    
    const existingColumns = await db.execute(checkQuery);
    
    // Check for index
    const indexQuery = sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'clients' 
      AND indexname = 'idx_clients_type'
    `;
    
    const existingIndex = await db.execute(indexQuery);
    
    // Get client counts
    let clientStats = { total: 0, prospects: 0, clients: 0 };
    
    if (existingColumns.rows.some(col => col.column_name === 'client_type')) {
      const statsQuery = sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN client_type = 'prospect' THEN 1 ELSE 0 END) as prospects,
          SUM(CASE WHEN client_type = 'client' THEN 1 ELSE 0 END) as clients
        FROM clients
      `;
      
      const stats = await db.execute(statsQuery);
      if (stats.rows.length > 0) {
        clientStats = {
          total: Number(stats.rows[0].total),
          prospects: Number(stats.rows[0].prospects),
          clients: Number(stats.rows[0].clients)
        };
      }
    }
    
    const migrationNeeded = existingColumns.rows.length < 3 || existingIndex.rows.length === 0;
    
    return NextResponse.json({
      migrationNeeded,
      existingColumns: existingColumns.rows,
      hasIndex: existingIndex.rows.length > 0,
      clientStats,
      message: migrationNeeded 
        ? 'Migration needed - some columns or index are missing' 
        : 'Migration already completed'
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}