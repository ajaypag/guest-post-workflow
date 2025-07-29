import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST() {
  try {
    console.log('[InvitationTableFix] === Starting invitations table migration ===');
    
    // Step 1: Rename accepted_at to used_at
    console.log('[InvitationTableFix] Renaming accepted_at to used_at...');
    await db.execute(`
      ALTER TABLE invitations 
      RENAME COLUMN accepted_at TO used_at;
    `);
    
    // Step 2: Add revoked_at column (missing entirely)
    console.log('[InvitationTableFix] Adding revoked_at column...');
    await db.execute(`
      ALTER TABLE invitations 
      ADD COLUMN revoked_at timestamp without time zone;
    `);
    
    // Step 3: Change invited_by from UUID to varchar for email
    console.log('[InvitationTableFix] Changing invited_by to created_by_email...');
    await db.execute(`
      ALTER TABLE invitations 
      DROP COLUMN invited_by;
    `);
    
    await db.execute(`
      ALTER TABLE invitations 
      ADD COLUMN created_by_email character varying(255) NOT NULL DEFAULT 'admin@system.com';
    `);
    
    console.log('[InvitationTableFix] === Migration completed successfully ===');
    
    return NextResponse.json({
      success: true,
      message: 'Invitations table fixed successfully',
      changes: [
        'Renamed accepted_at → used_at',
        'Added revoked_at column',
        'Replaced invited_by (uuid) → created_by_email (varchar)'
      ]
    });
  } catch (error) {
    console.error('[InvitationTableFix] === Migration failed ===');
    console.error('[InvitationTableFix] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fix invitations table'
    }, { status: 500 });
  }
}