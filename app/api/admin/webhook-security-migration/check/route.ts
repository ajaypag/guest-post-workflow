import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    // Check if webhook_security_logs table exists
    const result = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'webhook_security_logs'
      ) as exists;
    `);

    const exists = result.rows[0]?.exists || false;
    
    return NextResponse.json({
      success: true,
      exists,
      message: exists 
        ? 'webhook_security_logs table exists - migration already completed'
        : 'webhook_security_logs table does not exist - migration needed'
    });

  } catch (error) {
    console.error('Error checking table status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}