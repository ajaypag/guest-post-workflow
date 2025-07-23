import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('[Add Columns] Starting to add missing columns to link_orchestration_sessions table');
    
    const columnsAdded = [];
    const errors = [];
    
    // List of columns that were in the Drizzle schema but not in the actual database
    const columnsToAdd = [
      { name: 'internal_links_result', type: 'JSONB' },
      { name: 'client_mention_result', type: 'JSONB' },
      { name: 'client_link_result', type: 'JSONB' },
      { name: 'client_link_conversation', type: 'JSONB' },
      { name: 'image_strategy', type: 'JSONB' },
      { name: 'link_requests', type: 'TEXT' },
      { name: 'url_suggestion', type: 'TEXT' }
    ];
    
    // Add each column one by one
    for (const column of columnsToAdd) {
      try {
        console.log(`[Add Columns] Adding column: ${column.name} (${column.type})`);
        
        await db.execute(sql`
          ALTER TABLE link_orchestration_sessions 
          ADD COLUMN IF NOT EXISTS ${sql.identifier(column.name)} ${sql.raw(column.type)}
        `);
        
        columnsAdded.push(column.name);
        console.log(`[Add Columns] Successfully added column: ${column.name}`);
      } catch (error: any) {
        console.error(`[Add Columns] Error adding column ${column.name}:`, error);
        errors.push({
          column: column.name,
          error: error.message
        });
      }
    }
    
    // Check the final table structure
    const tableInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'link_orchestration_sessions'
      ORDER BY ordinal_position
    `);
    
    return NextResponse.json({
      success: true,
      message: `Added ${columnsAdded.length} columns successfully`,
      columnsAdded,
      errors: errors.length > 0 ? errors : undefined,
      currentSchema: tableInfo.rows
    });
    
  } catch (error: any) {
    console.error('[Add Columns] Critical error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        detail: error.detail,
        hint: error.hint
      }
    }, { status: 500 });
  }
}