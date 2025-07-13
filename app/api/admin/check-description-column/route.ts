import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET() {
  try {
    console.log('🔍 Checking if description column exists...');

    // Check if description column exists in target_pages table
    const result = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'target_pages' 
      AND column_name = 'description';
    `);

    const exists = result.rows && result.rows.length > 0;
    
    console.log(`📊 Description column exists: ${exists}`);

    return NextResponse.json({
      exists,
      message: exists 
        ? 'Description column exists in target_pages table' 
        : 'Description column does not exist in target_pages table'
    });

  } catch (error: any) {
    console.error('Error checking description column:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check description column existence', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}