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

    console.log('[AccountsTableFix] === Starting accounts table migration ===');
    const results: MigrationResult[] = [];

    try {
      // Step 1: Check if role column exists - THIS IS THE CRITICAL FIX
      console.log('[AccountsTableFix] Checking for role column in accounts table...');
      const columnCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'accounts' 
        AND column_name = 'role'
      `);
      
      if (columnCheck.rows.length > 0) {
        results.push({
          success: true,
          message: 'role column already exists in accounts table',
          details: 'No migration needed'
        });
      } else {
        console.log('[AccountsTableFix] Adding missing role column to accounts table...');
        await db.execute(sql`
          ALTER TABLE accounts 
          ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'viewer'
        `);
        
        results.push({
          success: true,
          message: 'Added role column to accounts table',
          details: 'VARCHAR(50) column with default "viewer"'
        });
      }
    } catch (error) {
      console.error('[AccountsTableFix] Failed to add role column:', error);
      results.push({
        success: false,
        message: 'Failed to add role column to accounts table',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 2: Validate other critical columns that might be missing
      console.log('[AccountsTableFix] Checking for other missing columns...');
      
      const expectedColumns = [
        'id', 'email', 'password', 'role', 'contact_name', 'company_name', 'phone', 
        'website', 'tax_id', 'billing_address', 'billing_city', 'billing_state',
        'billing_zip', 'billing_country', 'credit_terms', 'credit_limit',
        'primary_client_id', 'status', 'email_verified', 'email_verification_token',
        'reset_token', 'reset_token_expiry', 'internal_notes', 'order_preferences',
        'onboarding_completed', 'onboarding_steps', 'onboarding_completed_at',
        'created_at', 'updated_at', 'last_login_at'
      ];

      const actualColumnsResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'accounts'
        ORDER BY ordinal_position
      `);

      const actualColumns = actualColumnsResult.rows.map(row => row.column_name as string);
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));

      if (missingColumns.length > 0) {
        console.log('[AccountsTableFix] Found additional missing columns:', missingColumns);
        results.push({
          success: false,
          message: `Additional missing columns in accounts table: ${missingColumns.join(', ')}`,
          details: 'These columns need to be added manually or through separate migrations'
        });
      } else {
        results.push({
          success: true,
          message: 'All expected columns are present in accounts table',
          details: `Verified ${actualColumns.length} columns`
        });
      }
    } catch (error) {
      console.error('[AccountsTableFix] Failed to validate columns:', error);
      results.push({
        success: false,
        message: 'Failed to validate accounts table columns',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 3: Test the critical query that was failing
      console.log('[AccountsTableFix] Testing the query that was failing...');
      await db.execute(sql`
        SELECT id, email, role, contact_name, company_name, phone, website, tax_id, billing_address, billing_city, billing_state, billing_zip, billing_country, credit_terms, credit_limit, primary_client_id, status, email_verified, email_verification_token, reset_token, reset_token_expiry, internal_notes, order_preferences, onboarding_completed, onboarding_steps, onboarding_completed_at, created_at, updated_at, last_login_at 
        FROM accounts 
        WHERE email = 'test@example.com' 
        LIMIT 1
      `);
      
      results.push({
        success: true,
        message: 'Schema validation query successful',
        details: 'The accounts table now matches the expected schema and the original error is fixed'
      });
    } catch (error) {
      console.error('[AccountsTableFix] Schema validation failed:', error);
      results.push({
        success: false,
        message: 'Schema validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check if any steps failed
    const hasErrors = results.some(r => !r.success);
    
    console.log('[AccountsTableFix] === Migration completed ===');
    console.log('[AccountsTableFix] Results:', results);
    
    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Migration completed with errors' : 'Accounts table migration completed successfully',
      results,
      changes: results.filter(r => r.success && r.message.includes('Added')).map(r => r.message)
    });

  } catch (error) {
    console.error('[AccountsTableFix] === Critical migration error ===');
    console.error('[AccountsTableFix] Error:', error);
    
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
          WHERE table_name = 'accounts' 
          ORDER BY column_name
        `);

        const accountsCount = await db.execute(sql`
          SELECT COUNT(*) as total_accounts FROM accounts
        `);

        return NextResponse.json({
          tableColumns: tableInfo.rows,
          totalAccounts: accountsCount.rows[0]?.total_accounts || 0,
          migrationNeeded: !tableInfo.rows.some(row => row.column_name === 'role')
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