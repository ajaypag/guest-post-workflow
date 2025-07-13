import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "add" or "remove"' },
        { status: 400 }
      );
    }

    console.log(`🔄 Database migration action: ${action}`);

    if (action === 'add') {
      // Add keywords column
      await db.execute(`
        ALTER TABLE target_pages 
        ADD COLUMN IF NOT EXISTS keywords TEXT;
      `);
      
      console.log('✅ Keywords column added successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Keywords column added to target_pages table',
        action: 'add'
      });
      
    } else if (action === 'remove') {
      // Remove keywords column
      await db.execute(`
        ALTER TABLE target_pages 
        DROP COLUMN IF EXISTS keywords;
      `);
      
      console.log('✅ Keywords column removed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Keywords column removed from target_pages table',
        action: 'remove'
      });
    }

  } catch (error: any) {
    console.error('❌ Database migration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Database migration failed', 
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}