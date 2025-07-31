import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if user_type column exists
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'user_type'
      )
    `);
    
    const exists = result.rows[0]?.exists || false;
    
    // Also check if invitations table exists
    const invitationsResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'invitations'
      )
    `);
    
    const invitationsExists = invitationsResult.rows[0]?.exists || false;
    
    return NextResponse.json({
      exists: exists && invitationsExists,
      details: {
        userTypeColumn: exists,
        invitationsTable: invitationsExists
      }
    });
    
  } catch (error: any) {
    console.error('[Check User Type Column] Error:', error);
    
    return NextResponse.json({
      exists: false,
      error: error.message || 'Failed to check migration status'
    });
  }
}