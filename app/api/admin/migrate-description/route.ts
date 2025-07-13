import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST() {
  try {
    console.log('🟡 Starting description column migration...');

    // Check if column already exists
    const checkResult = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'target_pages' 
      AND column_name = 'description';
    `);

    if (checkResult.rows && checkResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Description column already exists in target_pages table'
      });
    }

    // Add the description column
    await db.execute(`
      ALTER TABLE target_pages 
      ADD COLUMN description TEXT;
    `);

    console.log('✅ Description column migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Description column added successfully to target_pages table'
    });

  } catch (error: any) {
    console.error('🔴 Error during description column migration:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to add description column', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🟡 Starting description column rollback...');

    // Check if column exists
    const checkResult = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'target_pages' 
      AND column_name = 'description';
    `);

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Description column does not exist in target_pages table'
      });
    }

    // Remove the description column
    await db.execute(`
      ALTER TABLE target_pages 
      DROP COLUMN description;
    `);

    console.log('✅ Description column rollback completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Description column removed successfully from target_pages table'
    });

  } catch (error: any) {
    console.error('🔴 Error during description column rollback:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to remove description column', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}