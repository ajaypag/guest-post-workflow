import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const diagnostics = {
      tableStatus: {
        exists: false,
        columns: [] as any[],
        indexes: [] as any[],
        rowCount: 0
      },
      columnAnalysis: {
        textColumns: [] as any[],
        varcharColumns: [] as any[],
        issues: [] as any[]
      },
      sampleData: {
        latestSessions: [] as any[],
        statusDistribution: [] as any[]
      },
      recommendations: [] as string[],
      diagnosis: {
        primaryIssue: '',
        likelyRoot: '',
        immediateAction: ''
      }
    };

    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'v2_agent_sessions'
      );
    `);
    
    diagnostics.tableStatus.exists = Boolean(tableCheck.rows[0]?.exists);

    if (!diagnostics.tableStatus.exists) {
      diagnostics.diagnosis = {
        primaryIssue: 'V2 Agent Sessions table does not exist',
        likelyRoot: 'Database migration has not been run',
        immediateAction: 'Run POST /api/admin/migrate-article-v2 to create the table'
      };
      diagnostics.recommendations.push('Create the v2_agent_sessions table using the migration endpoint');
      return NextResponse.json(diagnostics);
    }

    // Get column information
    const columns = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'v2_agent_sessions'
      ORDER BY ordinal_position;
    `);
    
    diagnostics.tableStatus.columns = columns.rows;

    // Analyze column types
    columns.rows.forEach((col: any) => {
      if (col.data_type === 'text') {
        diagnostics.columnAnalysis.textColumns.push({
          name: col.column_name,
          type: 'TEXT',
          status: '✅ Good for AI content'
        });
      } else if (col.data_type === 'character varying') {
        const isSmall = col.character_maximum_length && col.character_maximum_length < 255;
        diagnostics.columnAnalysis.varcharColumns.push({
          name: col.column_name,
          type: `VARCHAR(${col.character_maximum_length})`,
          status: isSmall ? '⚠️ May be too small for AI content' : '✅ OK'
        });
        
        if (isSmall && ['status', 'step_id'].indexOf(col.column_name) === -1) {
          diagnostics.columnAnalysis.issues.push({
            column: col.column_name,
            issue: `VARCHAR(${col.character_maximum_length}) may be too small`,
            recommendation: 'Consider using TEXT for AI-generated content'
          });
        }
      }
    });

    // Get indexes
    const indexes = await db.execute(sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'v2_agent_sessions'
      AND schemaname = 'public';
    `);
    
    diagnostics.tableStatus.indexes = indexes.rows;

    // Get row count and sample data
    const rowCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM v2_agent_sessions;
    `);
    
    diagnostics.tableStatus.rowCount = Number(rowCount.rows[0]?.count) || 0;

    if (diagnostics.tableStatus.rowCount > 0) {
      // Get latest sessions
      const latestSessions = await db.execute(sql`
        SELECT 
          id,
          workflow_id,
          version,
          status,
          total_sections,
          completed_sections,
          current_word_count,
          total_word_count,
          created_at
        FROM v2_agent_sessions
        ORDER BY created_at DESC
        LIMIT 5;
      `);
      
      diagnostics.sampleData.latestSessions = latestSessions.rows;

      // Get status distribution
      const statusDist = await db.execute(sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM v2_agent_sessions
        GROUP BY status
        ORDER BY count DESC;
      `);
      
      diagnostics.sampleData.statusDistribution = statusDist.rows;
    }

    // Check for common issues
    if (diagnostics.columnAnalysis.issues.length > 0) {
      diagnostics.recommendations.push('Some VARCHAR columns may be too small for AI content');
      diagnostics.recommendations.push('Run column size fix endpoint to update column types');
    }

    if (diagnostics.tableStatus.indexes.length < 2) {
      diagnostics.recommendations.push('Consider adding more indexes for better query performance');
    }

    // Set diagnosis
    if (diagnostics.columnAnalysis.issues.length > 0) {
      diagnostics.diagnosis = {
        primaryIssue: 'Some columns may have size constraints',
        likelyRoot: 'VARCHAR columns might be too small for AI-generated content',
        immediateAction: 'Review and fix column sizes using the fix endpoint'
      };
    } else if (diagnostics.tableStatus.rowCount === 0) {
      diagnostics.diagnosis = {
        primaryIssue: 'No V2 sessions created yet',
        likelyRoot: 'V2 feature has not been used',
        immediateAction: 'Test V2 article generation to create sessions'
      };
    } else {
      diagnostics.diagnosis = {
        primaryIssue: 'V2 system appears healthy',
        likelyRoot: 'All checks passed',
        immediateAction: 'No immediate action required'
      };
    }

    return NextResponse.json(diagnostics);
    
  } catch (error: any) {
    console.error('V2 diagnostics error:', error);
    return NextResponse.json({
      error: error.message,
      diagnosis: {
        primaryIssue: 'Diagnostic check failed',
        likelyRoot: error.message,
        immediateAction: 'Check error logs and database connection'
      }
    }, { status: 500 });
  }
}