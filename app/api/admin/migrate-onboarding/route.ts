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

    const results: MigrationResult[] = [];

    try {
      // Step 1: Add onboarding_completed column
      await db.execute(sql`
        ALTER TABLE accounts 
        ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE
      `);
      
      results.push({
        success: true,
        message: 'Added onboarding_completed column',
        details: 'BOOLEAN column with default FALSE'
      });
    } catch (error) {
      results.push({
        success: false,
        message: 'Failed to add onboarding_completed column',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 2: Add onboarding_steps column
      await db.execute(sql`
        ALTER TABLE accounts 
        ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{}'
      `);
      
      results.push({
        success: true,
        message: 'Added onboarding_steps column',
        details: 'JSONB column with default {}'
      });
    } catch (error) {
      results.push({
        success: false,
        message: 'Failed to add onboarding_steps column',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 3: Add onboarding_completed_at column
      await db.execute(sql`
        ALTER TABLE accounts 
        ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP
      `);
      
      results.push({
        success: true,
        message: 'Added onboarding_completed_at column',
        details: 'TIMESTAMP column (nullable)'
      });
    } catch (error) {
      results.push({
        success: false,
        message: 'Failed to add onboarding_completed_at column',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 4: Create index on onboarding_completed
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_accounts_onboarding 
        ON accounts(onboarding_completed)
      `);
      
      results.push({
        success: true,
        message: 'Created onboarding index',
        details: 'Index on onboarding_completed column for performance'
      });
    } catch (error) {
      results.push({
        success: false,
        message: 'Failed to create onboarding index',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 5: Get count of accounts that will be affected
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total_accounts 
        FROM accounts 
        WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE
      `);
      
      const totalAccounts = countResult.rows[0]?.total_accounts || 0;
      
      results.push({
        success: true,
        message: 'Migration completed successfully',
        details: `Migration affects ${totalAccounts} existing accounts`,
        affectedRows: Number(totalAccounts)
      });
    } catch (error) {
      results.push({
        success: false,
        message: 'Failed to count affected accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check if any steps failed
    const hasErrors = results.some(r => !r.success);
    
    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Migration completed with errors' : 'Migration completed successfully',
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
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
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'accounts' 
          AND column_name IN ('onboarding_completed', 'onboarding_steps', 'onboarding_completed_at')
          ORDER BY column_name
        `);

        const indexInfo = await db.execute(sql`
          SELECT indexname, indexdef
          FROM pg_indexes 
          WHERE tablename = 'accounts' 
          AND indexname LIKE '%onboarding%'
        `);

        const accountsCount = await db.execute(sql`
          SELECT COUNT(*) as total_accounts FROM accounts
        `);

        return NextResponse.json({
          tableColumns: tableInfo.rows,
          indexes: indexInfo.rows,
          totalAccounts: accountsCount.rows[0]?.total_accounts || 0,
          migrationNeeded: tableInfo.rows.length < 3 // Less than 3 onboarding columns
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