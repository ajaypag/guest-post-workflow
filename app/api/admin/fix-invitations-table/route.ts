import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { AuthServiceServer } from '@/lib/auth-server';
import { sql } from 'drizzle-orm';

interface MigrationResult {
  success: boolean;
  message: string;
  details?: string;
  affectedRows?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only internal admin users can run migrations
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    console.log('[InvitationTableFix] === Starting invitations table migration ===');
    const results: MigrationResult[] = [];

    try {
      // Step 1: Check if target_table column exists - THIS IS THE CRITICAL FIX
      console.log('[InvitationTableFix] Checking for target_table column...');
      const columnCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'target_table'
      `);
      
      if (columnCheck.rows.length > 0) {
        results.push({
          success: true,
          message: 'target_table column already exists',
          details: 'No migration needed'
        });
      } else {
        console.log('[InvitationTableFix] Adding missing target_table column...');
        await db.execute(sql`
          ALTER TABLE invitations 
          ADD COLUMN target_table VARCHAR(20) NOT NULL DEFAULT 'accounts'
        `);
        
        results.push({
          success: true,
          message: 'Added target_table column',
          details: 'VARCHAR(20) column with default "accounts"'
        });
      }
    } catch (error) {
      console.error('[InvitationTableFix] Failed to add target_table column:', error);
      results.push({
        success: false,
        message: 'Failed to add target_table column',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 2: Check if role column exists
      console.log('[InvitationTableFix] Checking for role column...');
      const roleColumnCheck = await db.execute(sql`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'role'
      `);
      
      if (roleColumnCheck.rows.length === 0) {
        console.log('[InvitationTableFix] Adding missing role column...');
        await db.execute(sql`
          ALTER TABLE invitations 
          ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user'
        `);
        
        results.push({
          success: true,
          message: 'Added role column',
          details: 'VARCHAR(50) column with default "user"'
        });
      } else {
        results.push({
          success: true,
          message: 'Role column already exists',
          details: `Type: ${roleColumnCheck.rows[0].data_type}, Length: ${roleColumnCheck.rows[0].character_maximum_length}`
        });
      }
    } catch (error) {
      console.error('[InvitationTableFix] Failed to check/add role column:', error);
      results.push({
        success: false,
        message: 'Failed to check/add role column',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 2.5: Check for user_type column and drop it if it exists (it's not in our schema)
      console.log('[InvitationTableFix] Checking for unexpected user_type column...');
      const userTypeCheck = await db.execute(sql`
        SELECT column_name, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'user_type'
      `);
      
      if (userTypeCheck.rows.length > 0) {
        console.log('[InvitationTableFix] Found unexpected user_type column, dropping it...');
        // First make it nullable if it's not
        if (userTypeCheck.rows[0].is_nullable === 'NO') {
          await db.execute(sql`
            ALTER TABLE invitations 
            ALTER COLUMN user_type DROP NOT NULL
          `);
        }
        // Then drop the column
        await db.execute(sql`
          ALTER TABLE invitations 
          DROP COLUMN user_type
        `);
        
        results.push({
          success: true,
          message: 'Removed unexpected user_type column from invitations table',
          details: 'Column was not part of the schema and was causing insert errors'
        });
      }
    } catch (error) {
      console.error('[InvitationTableFix] Failed to handle user_type column:', error);
      results.push({
        success: false,
        message: 'Failed to handle user_type column',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 3: Handle other column migrations if needed
      console.log('[InvitationTableFix] Checking for other required columns...');
      
      // Check if used_at exists (might be named accepted_at)
      const usedAtCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name IN ('used_at', 'accepted_at')
      `);
      
      const hasUsedAt = usedAtCheck.rows.some(row => row.column_name === 'used_at');
      const hasAcceptedAt = usedAtCheck.rows.some(row => row.column_name === 'accepted_at');
      
      if (hasAcceptedAt && !hasUsedAt) {
        console.log('[InvitationTableFix] Renaming accepted_at to used_at...');
        await db.execute(sql`
          ALTER TABLE invitations 
          RENAME COLUMN accepted_at TO used_at
        `);
        
        results.push({
          success: true,
          message: 'Renamed accepted_at to used_at',
          details: 'Column renamed for consistency'
        });
      }
      
      // Check if revoked_at exists
      const revokedAtCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'revoked_at'
      `);
      
      if (revokedAtCheck.rows.length === 0) {
        console.log('[InvitationTableFix] Adding revoked_at column...');
        await db.execute(sql`
          ALTER TABLE invitations 
          ADD COLUMN revoked_at TIMESTAMP
        `);
        
        results.push({
          success: true,
          message: 'Added revoked_at column',
          details: 'TIMESTAMP column for tracking revoked invitations'
        });
      }
      
      // Check if created_by_email exists
      const createdByEmailCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'created_by_email'
      `);
      
      if (createdByEmailCheck.rows.length === 0) {
        console.log('[InvitationTableFix] Adding created_by_email column...');
        await db.execute(sql`
          ALTER TABLE invitations 
          ADD COLUMN created_by_email VARCHAR(255) NOT NULL DEFAULT 'admin@system.com'
        `);
        
        results.push({
          success: true,
          message: 'Added created_by_email column',
          details: 'VARCHAR(255) column for tracking who created the invitation'
        });
      }
      
    } catch (error) {
      console.error('[InvitationTableFix] Failed to handle other columns:', error);
      results.push({
        success: false,
        message: 'Failed to handle other column migrations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 4: Test the critical query that was failing
      console.log('[InvitationTableFix] Testing the query that was failing...');
      await db.execute(sql`
        SELECT id, email, target_table, role, token, expires_at, used_at, revoked_at, created_by_email, created_at, updated_at 
        FROM invitations 
        WHERE email = 'test@example.com' AND target_table = 'accounts' AND used_at IS NULL AND revoked_at IS NULL 
        LIMIT 1
      `);
      
      results.push({
        success: true,
        message: 'Schema validation query successful',
        details: 'The invitations table now matches the expected schema and the original error is fixed'
      });
    } catch (error) {
      console.error('[InvitationTableFix] Schema validation failed:', error);
      results.push({
        success: false,
        message: 'Schema validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check if any steps failed
    const hasErrors = results.some(r => !r.success);
    
    console.log('[InvitationTableFix] === Migration completed ===');
    console.log('[InvitationTableFix] Results:', results);
    
    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Migration completed with errors' : 'Invitations table migration completed successfully',
      results
    });

  } catch (error) {
    console.error('[InvitationTableFix] === Critical migration error ===');
    console.error('[InvitationTableFix] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        results: [{
          success: false,
          message: 'Critical migration error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }]
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const check = url.searchParams.get('check');

    if (check) {
      // Check current database state
      try {
        const tableInfo = await db.execute(sql`
          SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns 
          WHERE table_name = 'invitations' 
          ORDER BY column_name
        `);

        const invitationsCount = await db.execute(sql`
          SELECT COUNT(*) as total_invitations FROM invitations
        `);

        return NextResponse.json({
          tableColumns: tableInfo.rows,
          totalInvitations: invitationsCount.rows[0]?.total_invitations || 0,
          migrationNeeded: !tableInfo.rows.some(row => row.column_name === 'target_table')
        });
      } catch (error) {
        return NextResponse.json({
          error: 'Failed to check database state',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'Use POST to run migration or GET with ?check=true to check current state' 
    });

  } catch (error) {
    console.error('Error checking migration state:', error);
    return NextResponse.json(
      { error: 'Failed to check migration state' },
      { status: 500 }
    );
  }
}