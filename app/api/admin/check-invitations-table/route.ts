import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET() {
  try {
    console.log('[TableCheck] Checking invitations table structure...');
    
    // Check if table exists and get column info
    const result = await db.execute(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'invitations' 
      ORDER BY ordinal_position;
    `);
    
    console.log('[TableCheck] Table structure:', result.rows);
    
    return NextResponse.json({
      success: true,
      exists: result.rows.length > 0,
      columns: result.rows,
      message: result.rows.length > 0 
        ? `Found ${result.rows.length} columns in invitations table`
        : 'Invitations table not found'
    });
  } catch (error) {
    console.error('[TableCheck] Error checking table:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      exists: false,
      columns: []
    }, { status: 500 });
  }
}