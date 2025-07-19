import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check table existence
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'v2_agent_sessions'
      );
    `);

    // Get column details with focus on VARCHAR sizes
    const columnAnalysis = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'v2_agent_sessions'
      ORDER BY ordinal_position;
    `);

    // Analyze VARCHAR columns for potential issues
    const varcharColumns = columnAnalysis.rows
      .filter(col => col.data_type === 'character varying')
      .map(col => ({
        name: col.column_name,
        type: `varchar(${col.character_maximum_length})`,
        status: Number(col.character_maximum_length) < 255 ? '⚠️ SMALL' : '✅ OK',
        recommendation: Number(col.character_maximum_length) < 255 
          ? 'Consider increasing to 255+ for AI-generated content'
          : 'Good size for AI content'
      }));

    // Get latest V2 semantic audit sessions
    const latestSessions = await db.execute(sql`
      SELECT 
        id,
        workflow_id,
        version,
        status,
        completed_sections,
        LENGTH(final_article) as article_length,
        error_message,
        created_at
      FROM v2_agent_sessions
      WHERE step_id = 'content-audit'
      ORDER BY created_at DESC
      LIMIT 10;
    `);

    // Get status distribution
    const statusDistribution = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM v2_agent_sessions
      WHERE step_id = 'content-audit'
      GROUP BY status
      ORDER BY count DESC;
    `);

    // Check for common error patterns
    const errorAnalysis = await db.execute(sql`
      SELECT 
        CASE 
          WHEN error_message LIKE '%content.map%' THEN 'content.map error'
          WHEN error_message LIKE '%timeout%' THEN 'timeout error'
          WHEN error_message LIKE '%rate limit%' THEN 'rate limit error'
          WHEN error_message LIKE '%Cannot read properties of null%' THEN 'null reference error'
          ELSE 'other error'
        END as error_type,
        COUNT(*) as count
      FROM v2_agent_sessions
      WHERE step_id = 'content-audit' 
        AND status = 'failed' 
        AND error_message IS NOT NULL
      GROUP BY error_type
      ORDER BY count DESC;
    `);

    // Failed sessions with details
    const failedSessions = await db.execute(sql`
      SELECT 
        id,
        workflow_id,
        version,
        error_message,
        session_metadata,
        created_at
      FROM v2_agent_sessions
      WHERE step_id = 'content-audit' 
        AND status = 'failed'
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    // Column size issues
    const columnIssues = varcharColumns
      .filter(col => col.status.includes('SMALL'))
      .map(col => ({
        column: col.name,
        issue: `VARCHAR size too small (${col.type})`,
        recommendation: 'Use TEXT or VARCHAR(255+) for AI content'
      }));

    // Generate recommendations
    const recommendations = [];
    
    if (!tableCheck.rows[0].exists) {
      recommendations.push('Table does not exist - run migration first');
    }
    
    if (columnIssues.length > 0) {
      recommendations.push('Some VARCHAR columns may be too small for AI content');
    }
    
    if (errorAnalysis.rows.some(e => e.error_type === 'content.map error')) {
      recommendations.push('Message format issues detected - check conversation history structure');
    }
    
    if (errorAnalysis.rows.some(e => e.error_type === 'null reference error')) {
      recommendations.push('Null reference errors detected - add defensive coding');
    }

    if (statusDistribution.rows.some(s => s.status === 'failed' && parseInt(String(s.count)) > 5)) {
      recommendations.push('High failure rate detected - review error patterns');
    }

    // Generate diagnosis
    let primaryIssue = 'System appears healthy';
    let likelyRoot = 'No issues detected';
    let immediateAction = 'Continue monitoring';

    if (!tableCheck.rows[0].exists) {
      primaryIssue = 'V2 agent sessions table missing';
      likelyRoot = 'Migration not run';
      immediateAction = 'Run database migration';
    } else if (columnIssues.length > 0) {
      primaryIssue = 'Column size constraints may cause issues';
      likelyRoot = 'VARCHAR columns too small for AI content';
      immediateAction = 'Run column fix to expand VARCHAR sizes';
    } else if (failedSessions.rows.length > 0) {
      primaryIssue = 'Sessions failing with errors';
      likelyRoot = String(failedSessions.rows[0].error_message || 'Unknown error');
      immediateAction = 'Review error patterns and add error handling';
    }

    return NextResponse.json({
      tableStatus: {
        exists: tableCheck.rows[0].exists,
        columns: columnAnalysis.rows,
        rowCount: latestSessions.rows.length
      },
      columnAnalysis: {
        textColumns: columnAnalysis.rows
          .filter(col => col.data_type === 'text')
          .map(col => ({
            name: col.column_name,
            status: '✅ TEXT'
          })),
        varcharColumns,
        issues: columnIssues
      },
      sampleData: {
        latestSessions: latestSessions.rows,
        statusDistribution: statusDistribution.rows,
        failedSessions: failedSessions.rows
      },
      errorAnalysis: {
        enabled: true,
        errorPatterns: errorAnalysis.rows,
        commonErrors: errorAnalysis.rows.map(e => ({
          error: e.error_type,
          count: parseInt(String(e.count)),
          percentage: Math.round((parseInt(String(e.count)) / Math.max(1, failedSessions.rows.length)) * 100)
        }))
      },
      recommendations,
      diagnosis: {
        primaryIssue,
        likelyRoot,
        immediateAction
      }
    });

  } catch (error) {
    console.error('Error diagnosing V2 semantic audit:', error);
    return NextResponse.json({ 
      error: 'Failed to run diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}