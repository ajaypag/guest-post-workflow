import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if the column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'invoice_data'
    `);

    if (checkColumn.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Column invoice_data already exists'
      });
    }

    // Add the invoice_data column
    await db.execute(sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS invoice_data JSONB
    `);

    return NextResponse.json({
      success: true,
      message: 'Successfully added invoice_data column to orders table'
    });

  } catch (error) {
    console.error('Error adding invoice_data column:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add invoice_data column', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}