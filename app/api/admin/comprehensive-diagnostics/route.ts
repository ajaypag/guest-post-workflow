import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { AuthServiceServer } from '@/lib/auth-server';
import { sql } from 'drizzle-orm';

interface TableDiagnostic {
  status: 'healthy' | 'warning' | 'error';
  columnCount: number;
  recordCount: number;
  missingColumns: string[];
  issues: string[];
  expectedColumns: string[];
  actualColumns: string[];
  error?: string;
}

interface CriticalIssue {
  table: string;
  error: string;
  description: string;
  query?: string;
  recommendation: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only internal admin users can run diagnostics
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    console.log('[ComprehensiveDiagnostics] === Starting comprehensive database diagnostics ===');
    
    const tables: { [key: string]: TableDiagnostic } = {};
    const criticalIssues: CriticalIssue[] = [];

    // Expected schema definitions (based on our Drizzle schemas)
    const expectedSchemas = {
      invitations: [
        'id', 'email', 'target_table', 'role', 'token', 'expires_at', 
        'used_at', 'revoked_at', 'created_by_email', 'created_at', 'updated_at'
      ],
      accounts: [
        'id', 'email', 'password', 'contact_name', 'company_name', 'phone', 
        'website', 'tax_id', 'billing_address', 'billing_city', 'billing_state',
        'billing_zip', 'billing_country', 'credit_terms', 'credit_limit',
        'primary_client_id', 'status', 'email_verified', 'email_verification_token',
        'reset_token', 'reset_token_expiry', 'internal_notes', 'order_preferences',
        'onboarding_completed', 'onboarding_steps', 'onboarding_completed_at',
        'created_at', 'updated_at', 'last_login_at'
      ],
      users: [
        'id', 'email', 'name', 'password_hash', 'role', 'is_active',
        'last_login', 'created_at', 'updated_at'
      ],
      publishers: [
        'id', 'email', 'password', 'contact_name', 'company_name', 'phone',
        'status', 'email_verified', 'email_verification_token', 'reset_token',
        'reset_token_expiry', 'created_at', 'updated_at', 'last_login_at'
      ],
      orders: [
        'id', 'account_id', 'order_number', 'status', 'total_amount',
        'currency', 'payment_status', 'created_at', 'updated_at'
      ],
      payments: [
        'id', 'order_id', 'account_id', 'amount', 'status', 'method',
        'transaction_id', 'processed_at', 'recorded_by', 'notes',
        'created_at', 'updated_at'
      ],
      workflows: [
        'id', 'user_id', 'client_id', 'title', 'status', 'content', 
        'target_pages', 'order_item_id', 'created_at', 'updated_at'
      ],
      workflow_steps: [
        'id', 'workflow_id', 'step_number', 'title', 'description', 'status',
        'inputs', 'outputs', 'completed_at', 'created_at', 'updated_at'
      ]
    };

    // Test critical queries that are currently failing
    const criticalQueries = [
      {
        name: 'invitations_check',
        table: 'invitations',
        query: `SELECT id, email, target_table, role, token, expires_at, used_at, revoked_at, created_by_email, created_at, updated_at 
                FROM invitations 
                WHERE email = 'test@example.com' AND target_table = 'accounts' AND used_at IS NULL AND revoked_at IS NULL 
                LIMIT 1`,
        description: 'Check if invitations table matches expected schema'
      },
      {
        name: 'accounts_check',
        table: 'accounts',
        query: `SELECT id, email, role, contact_name, company_name, phone, website, tax_id, billing_address, billing_city, billing_state, billing_zip, billing_country, credit_terms, credit_limit, primary_client_id, status, email_verified, email_verification_token, reset_token, reset_token_expiry, internal_notes, order_preferences, onboarding_completed, onboarding_steps, onboarding_completed_at, created_at, updated_at, last_login_at 
                FROM accounts 
                WHERE email = 'test@example.com' 
                LIMIT 1`,
        description: 'Check if accounts table matches expected schema (the current failing query)'
      }
    ];

    // Run critical query tests first
    console.log('[ComprehensiveDiagnostics] Testing critical queries...');
    for (const queryTest of criticalQueries) {
      try {
        await db.execute(sql.raw(queryTest.query));
        console.log(`[ComprehensiveDiagnostics] ✅ ${queryTest.name} passed`);
      } catch (error) {
        console.error(`[ComprehensiveDiagnostics] ❌ ${queryTest.name} failed:`, error);
        criticalIssues.push({
          table: queryTest.table,
          error: error instanceof Error ? error.message : 'Unknown error',
          description: queryTest.description,
          query: queryTest.query,
          recommendation: `The ${queryTest.table} table is missing required columns or has schema mismatch`
        });
      }
    }

    // Analyze each table
    for (const [tableName, expectedColumns] of Object.entries(expectedSchemas)) {
      console.log(`[ComprehensiveDiagnostics] Analyzing table: ${tableName}`);
      
      try {
        // Get actual table structure
        const columnInfo = await db.execute(sql`
          SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `);

        const actualColumns = columnInfo.rows.map(row => row.column_name as string);
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));

        // Get record count
        let recordCount = 0;
        try {
          const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as total FROM ${tableName}`));
          recordCount = parseInt(String(countResult.rows[0]?.total || '0'));
        } catch (error) {
          console.error(`[ComprehensiveDiagnostics] Failed to count records in ${tableName}:`, error);
        }

        // Determine status
        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        const issues: string[] = [];

        if (missingColumns.length > 0) {
          status = 'error';
          issues.push(`Missing columns: ${missingColumns.join(', ')}`);
        }

        if (extraColumns.length > 0) {
          if (status === 'healthy') status = 'warning';
          issues.push(`Extra columns: ${extraColumns.join(', ')}`);
        }

        tables[tableName] = {
          status,
          columnCount: actualColumns.length,
          recordCount,
          missingColumns,
          issues,
          expectedColumns,
          actualColumns
        };

        console.log(`[ComprehensiveDiagnostics] ${tableName}: ${status} (${actualColumns.length} columns, ${recordCount} records)`);

      } catch (error) {
        console.error(`[ComprehensiveDiagnostics] Failed to analyze ${tableName}:`, error);
        tables[tableName] = {
          status: 'error',
          columnCount: 0,
          recordCount: 0,
          missingColumns: expectedColumns,
          issues: ['Table analysis failed'],
          expectedColumns,
          actualColumns: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Generate summary
    const healthyTables = Object.values(tables).filter(t => t.status === 'healthy').length;
    const warningTables = Object.values(tables).filter(t => t.status === 'warning').length;
    const errorTables = Object.values(tables).filter(t => t.status === 'error').length;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalTables: Object.keys(tables).length,
        healthyTables,
        warningTables,
        errorTables,
        criticalIssuesCount: criticalIssues.length
      },
      criticalIssues,
      tables,
      recommendations: generateRecommendations(criticalIssues, tables)
    };

    console.log('[ComprehensiveDiagnostics] === Diagnostics completed ===');
    console.log(`[ComprehensiveDiagnostics] Summary: ${healthyTables} healthy, ${warningTables} warnings, ${errorTables} errors, ${criticalIssues.length} critical issues`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[ComprehensiveDiagnostics] === Critical diagnostics error ===');
    console.error('[ComprehensiveDiagnostics] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Diagnostics failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateRecommendations(criticalIssues: CriticalIssue[], tables: { [key: string]: TableDiagnostic }): string[] {
  const recommendations: string[] = [];

  // Critical issues first
  if (criticalIssues.length > 0) {
    recommendations.push('CRITICAL: Fix database schema mismatches before using invitation system');
    
    for (const issue of criticalIssues) {
      if (issue.table === 'invitations' && issue.error.includes('target_table')) {
        recommendations.push('Run the invitations table migration to add missing target_table column');
      }
      if (issue.table === 'accounts' && issue.error.includes('role')) {
        recommendations.push('The accounts table is missing a "role" column - this needs to be added');
      }
    }
  }

  // Table-specific recommendations
  for (const [tableName, tableInfo] of Object.entries(tables)) {
    if (tableInfo.status === 'error' && tableInfo.missingColumns.length > 0) {
      recommendations.push(`${tableName}: Add missing columns: ${tableInfo.missingColumns.join(', ')}`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All tables appear healthy! No immediate action required.');
  }

  return recommendations;
}