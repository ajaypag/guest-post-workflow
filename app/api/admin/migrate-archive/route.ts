import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ARCHIVE MIGRATION] Starting archive columns migration...');

    // Add archive columns to clients table
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS archive_reason TEXT
    `);

    console.log('[ARCHIVE MIGRATION] Archive columns added successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Archive columns added successfully to clients table'
    });

  } catch (error: any) {
    console.error('[ARCHIVE MIGRATION] Error:', error);
    
    // Check if columns already exist
    if (error.message?.includes('already exists')) {
      return NextResponse.json({ 
        success: true,
        message: 'Archive columns already exist in clients table'
      });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Migration failed',
      success: false 
    }, { status: 500 });
  }
}

// Rollback endpoint
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ARCHIVE MIGRATION] Rolling back archive columns...');

    // Remove archive columns from clients table
    await db.execute(sql`
      ALTER TABLE clients 
      DROP COLUMN IF EXISTS archived_at,
      DROP COLUMN IF EXISTS archived_by,
      DROP COLUMN IF EXISTS archive_reason
    `);

    console.log('[ARCHIVE MIGRATION] Archive columns removed successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Archive columns removed successfully from clients table'
    });

  } catch (error: any) {
    console.error('[ARCHIVE MIGRATION] Rollback error:', error);
    return NextResponse.json({ 
      error: error.message || 'Rollback failed',
      success: false 
    }, { status: 500 });
  }
}