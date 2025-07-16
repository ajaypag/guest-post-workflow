import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { polishSessions, polishSections, workflows } from '@/lib/db/schema';
import { sql, eq, and, desc, isNull, isNotNull } from 'drizzle-orm';

interface HealthCheckResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  details: any;
  recommendation?: string;
}

export async function GET(request: NextRequest) {
  const results: HealthCheckResult[] = [];
  const timestamp = new Date().toISOString();

  try {
    // 1. DATABASE CONNECTIVITY & SCHEMA
    try {
      const tableCheck = await db.execute(sql`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name IN ('polish_sessions', 'polish_sections')
        ORDER BY table_name, ordinal_position
      `);

      const hasPolishSessions = tableCheck.rows.some((r: any) => r.table_name === 'polish_sessions');
      const hasPolishSections = tableCheck.rows.some((r: any) => r.table_name === 'polish_sections');

      results.push({
        category: 'Database Schema',
        test: 'Tables exist',
        status: hasPolishSessions && hasPolishSections ? 'pass' : 'fail',
        details: {
          polish_sessions: hasPolishSessions,
          polish_sections: hasPolishSections,
          columns: tableCheck.rows
        },
        recommendation: !hasPolishSessions || !hasPolishSections ? 'Run migration: /api/admin/migrate-polish' : undefined
      });
    } catch (error: any) {
      results.push({
        category: 'Database Schema',
        test: 'Tables exist',
        status: 'fail',
        details: { error: error.message },
        recommendation: 'Check database connection and permissions'
      });
    }

    // 2. RECENT POLISH SESSIONS
    try {
      const recentSessions = await db.select({
        id: polishSessions.id,
        workflowId: polishSessions.workflowId,
        version: polishSessions.version,
        status: polishSessions.status,
        createdAt: polishSessions.createdAt,
        completedAt: polishSessions.completedAt,
        errorMessage: polishSessions.errorMessage
      })
      .from(polishSessions)
      .orderBy(desc(polishSessions.createdAt))
      .limit(10);

      const statusCounts = recentSessions.reduce((acc: any, session) => {
        acc[session.status] = (acc[session.status] || 0) + 1;
        return acc;
      }, {});

      const errorRate = recentSessions.filter(s => s.status === 'error').length / Math.max(recentSessions.length, 1);

      results.push({
        category: 'Session Health',
        test: 'Recent session success rate',
        status: errorRate > 0.5 ? 'fail' : errorRate > 0.2 ? 'warning' : 'pass',
        details: {
          totalRecent: recentSessions.length,
          statusCounts,
          errorRate: `${(errorRate * 100).toFixed(1)}%`,
          recentErrors: recentSessions.filter(s => s.errorMessage).map(s => ({
            id: s.id,
            error: s.errorMessage,
            createdAt: s.createdAt
          }))
        },
        recommendation: errorRate > 0.2 ? 'High error rate detected. Check error messages for patterns.' : undefined
      });
    } catch (error: any) {
      results.push({
        category: 'Session Health',
        test: 'Recent session success rate',
        status: 'fail',
        details: { error: error.message }
      });
    }

    // 3. DATA INTEGRITY CHECKS
    try {
      // Check for orphaned sections
      const orphanedSections = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM polish_sections ps
        LEFT JOIN polish_sessions sess ON ps.polish_session_id = sess.id
        WHERE sess.id IS NULL
      `);

      results.push({
        category: 'Data Integrity',
        test: 'Orphaned sections',
        status: (orphanedSections.rows[0] as any).count > 0 ? 'warning' : 'pass',
        details: {
          orphanedCount: (orphanedSections.rows[0] as any).count
        },
        recommendation: (orphanedSections.rows[0] as any).count > 0 ? 'Found sections without parent sessions' : undefined
      });

      // Check for sessions without sections
      const incompleteSessions = await db.execute(sql`
        SELECT 
          sess.id,
          sess.workflow_id,
          sess.status,
          COUNT(sec.id) as section_count
        FROM polish_sessions sess
        LEFT JOIN polish_sections sec ON sec.polish_session_id = sess.id
        WHERE sess.status = 'completed'
        GROUP BY sess.id, sess.workflow_id, sess.status
        HAVING COUNT(sec.id) = 0
      `);

      results.push({
        category: 'Data Integrity',
        test: 'Completed sessions with no sections',
        status: incompleteSessions.rows.length > 0 ? 'warning' : 'pass',
        details: {
          incompleteCount: incompleteSessions.rows.length,
          sessions: incompleteSessions.rows
        }
      });
    } catch (error: any) {
      results.push({
        category: 'Data Integrity',
        test: 'Data integrity checks',
        status: 'fail',
        details: { error: error.message }
      });
    }

    // 4. ENCODING & SPECIAL CHARACTERS
    try {
      // Safe check for problematic characters
      const encodingIssues = await db.execute(sql`
        SELECT 
          'sessions' as table_name,
          id,
          CASE 
            WHEN POSITION('\\x00'::bytea IN CAST(polish_metadata::text AS bytea)) > 0 THEN true
            ELSE false
          END as has_null_bytes,
          CASE
            WHEN LENGTH(regexp_replace(polish_metadata::text, '[\\x01-\\x1F]', '', 'g')) < LENGTH(polish_metadata::text) THEN true
            ELSE false
          END as has_control_chars
        FROM polish_sessions
        WHERE polish_metadata IS NOT NULL
        LIMIT 100
      `);

      const nullByteCount = encodingIssues.rows.filter((r: any) => r.has_null_bytes).length;
      const controlCharCount = encodingIssues.rows.filter((r: any) => r.has_control_chars).length;

      results.push({
        category: 'Encoding Issues',
        test: 'Null bytes in data',
        status: nullByteCount > 0 ? 'fail' : 'pass',
        details: {
          affectedRecords: nullByteCount,
          sample: encodingIssues.rows.filter((r: any) => r.has_null_bytes).slice(0, 5)
        },
        recommendation: nullByteCount > 0 ? 'Use /admin/fix-polish to clean null bytes' : undefined
      });

      results.push({
        category: 'Encoding Issues',
        test: 'Control characters in data',
        status: controlCharCount > 10 ? 'warning' : 'pass',
        details: {
          affectedRecords: controlCharCount,
          percentage: `${(controlCharCount / Math.max(encodingIssues.rows.length, 1) * 100).toFixed(1)}%`
        }
      });
    } catch (error: any) {
      results.push({
        category: 'Encoding Issues',
        test: 'Character encoding checks',
        status: 'fail',
        details: { error: error.message },
        recommendation: 'Encoding check failed - may indicate existing null bytes'
      });
    }

    // 5. WORKFLOW INTEGRATION
    try {
      // Check if polish outputs are properly saved to workflows
      const workflowIntegration = await db.execute(sql`
        SELECT 
          w.id,
          w.title,
          (w.content->>'steps')::jsonb as steps,
          EXISTS(
            SELECT 1 FROM polish_sessions ps 
            WHERE ps.workflow_id = w.id AND ps.status = 'completed'
          ) as has_polish_session
        FROM workflows w
        WHERE w.status = 'completed'
        ORDER BY w.updated_at DESC
        LIMIT 20
      `);

      let missingPolishOutput = 0;
      let polishStepMissing = 0;

      for (const workflow of workflowIntegration.rows) {
        const steps = workflow.steps as any;
        const polishStep = steps?.find((s: any) => s.id === 'final-polish');
        
        if (!polishStep) {
          polishStepMissing++;
        } else if (workflow.has_polish_session && !polishStep.outputs?.polishedArticle) {
          missingPolishOutput++;
        }
      }

      results.push({
        category: 'Workflow Integration',
        test: 'Polish output saved to workflows',
        status: missingPolishOutput > 0 ? 'warning' : 'pass',
        details: {
          workflowsChecked: workflowIntegration.rows.length,
          missingPolishStep: polishStepMissing,
          missingPolishOutput,
          successRate: `${((1 - missingPolishOutput / Math.max(workflowIntegration.rows.length, 1)) * 100).toFixed(1)}%`
        },
        recommendation: missingPolishOutput > 0 ? 'Some completed polish sessions did not save output to workflow' : undefined
      });
    } catch (error: any) {
      results.push({
        category: 'Workflow Integration',
        test: 'Workflow integration',
        status: 'fail',
        details: { error: error.message }
      });
    }

    // 6. PERFORMANCE METRICS
    try {
      const performanceMetrics = await db.execute(sql`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
          MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) as max_duration_seconds,
          MIN(EXTRACT(EPOCH FROM (completed_at - started_at))) as min_duration_seconds,
          COUNT(*) as sample_size
        FROM polish_sessions
        WHERE status = 'completed' 
          AND completed_at IS NOT NULL 
          AND started_at IS NOT NULL
          AND completed_at > started_at
      `);

      const metrics = performanceMetrics.rows[0] as any;
      const avgMinutes = (metrics.avg_duration_seconds || 0) / 60;

      results.push({
        category: 'Performance',
        test: 'Polish completion time',
        status: avgMinutes > 30 ? 'warning' : 'pass',
        details: {
          averageDuration: `${avgMinutes.toFixed(1)} minutes`,
          maxDuration: `${((metrics.max_duration_seconds || 0) / 60).toFixed(1)} minutes`,
          minDuration: `${((metrics.min_duration_seconds || 0) / 60).toFixed(1)} minutes`,
          sampleSize: metrics.sample_size
        },
        recommendation: avgMinutes > 30 ? 'Polish sessions taking longer than expected' : undefined
      });
    } catch (error: any) {
      results.push({
        category: 'Performance',
        test: 'Performance metrics',
        status: 'fail',
        details: { error: error.message }
      });
    }

    // 7. RECENT ERRORS ANALYSIS
    try {
      const recentErrors = await db.select()
        .from(polishSessions)
        .where(and(
          eq(polishSessions.status, 'error'),
          isNotNull(polishSessions.errorMessage)
        ))
        .orderBy(desc(polishSessions.createdAt))
        .limit(10);

      const errorPatterns: { [key: string]: number } = {};
      
      recentErrors.forEach(session => {
        const error = session.errorMessage || '';
        if (error.includes('null byte')) errorPatterns['Null byte errors'] = (errorPatterns['Null byte errors'] || 0) + 1;
        if (error.includes('timeout')) errorPatterns['Timeout errors'] = (errorPatterns['Timeout errors'] || 0) + 1;
        if (error.includes('rate limit')) errorPatterns['Rate limit errors'] = (errorPatterns['Rate limit errors'] || 0) + 1;
        if (error.includes('connection')) errorPatterns['Connection errors'] = (errorPatterns['Connection errors'] || 0) + 1;
        if (error.includes('UTF8') || error.includes('encoding')) errorPatterns['Encoding errors'] = (errorPatterns['Encoding errors'] || 0) + 1;
      });

      results.push({
        category: 'Error Analysis',
        test: 'Recent error patterns',
        status: recentErrors.length > 5 ? 'warning' : 'pass',
        details: {
          totalRecentErrors: recentErrors.length,
          errorPatterns,
          recentErrorMessages: recentErrors.slice(0, 3).map(e => ({
            id: e.id,
            workflowId: e.workflowId,
            error: (e.errorMessage || '').substring(0, 200),
            when: e.createdAt
          }))
        }
      });
    } catch (error: any) {
      results.push({
        category: 'Error Analysis',
        test: 'Error pattern analysis',
        status: 'fail',
        details: { error: error.message }
      });
    }

    // Calculate overall health score
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'pass').length;
    const failedTests = results.filter(r => r.status === 'fail').length;
    const warningTests = results.filter(r => r.status === 'warning').length;
    const healthScore = Math.round((passedTests / totalTests) * 100);

    // Determine critical issues
    const criticalIssues = results
      .filter(r => r.status === 'fail')
      .map(r => `${r.category}: ${r.test}`);

    const recommendations = results
      .filter(r => r.recommendation)
      .map(r => r.recommendation);

    return NextResponse.json({
      success: true,
      timestamp,
      summary: {
        healthScore,
        totalTests,
        passed: passedTests,
        failed: failedTests,
        warnings: warningTests,
        status: failedTests > 0 ? 'critical' : warningTests > 2 ? 'warning' : 'healthy',
        criticalIssues,
        recommendations: [...new Set(recommendations)] // Remove duplicates
      },
      results,
      quickActions: {
        fixNullBytes: failedTests > 0 && results.some(r => r.test === 'Null bytes in data' && r.status === 'fail'),
        runMigration: results.some(r => r.test === 'Tables exist' && r.status === 'fail'),
        checkErrors: results.some(r => r.category === 'Error Analysis' && r.status === 'warning')
      }
    });

  } catch (error: any) {
    console.error('Polish health check error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
      summary: {
        healthScore: 0,
        status: 'error',
        criticalIssues: ['Health check system failure'],
        recommendations: ['Check system logs and database connectivity']
      },
      results
    });
  }
}

// Fix endpoint for common issues
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'clean-orphaned-sections':
        const cleanResult = await db.execute(sql`
          DELETE FROM polish_sections
          WHERE polish_session_id NOT IN (
            SELECT id FROM polish_sessions
          )
        `);
        return NextResponse.json({ 
          success: true, 
          message: 'Orphaned sections cleaned',
          affected: cleanResult.rowCount 
        });

      case 'reset-stuck-sessions':
        const resetResult = await db.execute(sql`
          UPDATE polish_sessions
          SET status = 'error',
              error_message = 'Session stuck in polishing state - automatically reset',
              updated_at = NOW()
          WHERE status = 'polishing'
            AND updated_at < NOW() - INTERVAL '1 hour'
        `);
        return NextResponse.json({ 
          success: true, 
          message: 'Stuck sessions reset',
          affected: resetResult.rowCount 
        });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown action' 
        });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    });
  }
}