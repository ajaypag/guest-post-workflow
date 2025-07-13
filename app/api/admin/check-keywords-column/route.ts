import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking if keywords column exists...');

    // Check if keywords column exists in target_pages table
    const result = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'target_pages' 
      AND column_name = 'keywords';
    `);

    const exists = result.length > 0;
    
    console.log(`📊 Keywords column exists: ${exists}`);
    
    return NextResponse.json({
      exists,
      table: 'target_pages',
      column: 'keywords',
      message: exists 
        ? 'Keywords column exists in target_pages table' 
        : 'Keywords column does not exist in target_pages table'
    });

  } catch (error: any) {
    console.error('❌ Error checking keywords column:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check column existence', 
        details: error.message,
        exists: false
      },
      { status: 500 }
    );
  }
}