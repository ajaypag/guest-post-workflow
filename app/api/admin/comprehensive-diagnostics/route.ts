import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      issues: [],
      warnings: [],
      tableSchemas: {},
      sampleData: {},
      recommendations: []
    };

    // 1. Check all table schemas
    const tableChecks = [
      'workflows',
      'workflow_steps',
      'formatting_qa_sessions', 
      'formatting_qa_checks',
      'article_sections',
      'agent_sessions',
      'audit_sessions',
      'audit_sections',
      'polish_sessions',
      'polish_sections'
    ];

    for (const tableName of tableChecks) {
      try {
        // Get table columns
        const columnsResult = await db.execute(sql`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `);

        diagnostics.tableSchemas[tableName] = {
          exists: columnsResult.rows.length > 0,
          columns: columnsResult.rows
        };

        if (columnsResult.rows.length === 0) {
          diagnostics.issues.push({
            severity: 'ERROR',
            table: tableName,
            message: `Table ${tableName} does not exist`
          });
        }

        // Get row count
        if (columnsResult.rows.length > 0) {
          const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.raw(tableName)}`);
          diagnostics.tableSchemas[tableName].rowCount = countResult.rows[0].count;
        }

      } catch (e: any) {
        diagnostics.issues.push({
          severity: 'ERROR',
          table: tableName,
          message: `Failed to check table ${tableName}: ${e.message}`
        });
      }
    }

    // 2. Specific check for workflow_steps columns
    const workflowStepsSchema = diagnostics.tableSchemas.workflow_steps;
    if (workflowStepsSchema?.exists) {
      const columns = workflowStepsSchema.columns.map((c: any) => c.column_name);
      
      // Check for expected columns
      const expectedColumns = ['id', 'workflow_id', 'step_number', 'title', 'description', 'status', 'inputs', 'outputs', 'completed_at', 'created_at', 'updated_at'];
      const missingColumns = expectedColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        diagnostics.issues.push({
          severity: 'CRITICAL',
          table: 'workflow_steps',
          message: `Missing expected columns: ${missingColumns.join(', ')}`,
          impact: 'This will cause queries to fail when trying to access these columns'
        });
      }

      // Check if step_number specifically exists (the error column)
      if (!columns.includes('step_number')) {
        diagnostics.issues.push({
          severity: 'CRITICAL',
          table: 'workflow_steps',
          message: 'Column step_number is missing - this is causing the current error',
          recommendation: 'Need to add step_number column or update queries to not use it'
        });
      }
    }

    // 3. Check workflows table structure
    const workflowsSchema = diagnostics.tableSchemas.workflows;
    if (workflowsSchema?.exists) {
      // Check if content column is JSONB
      const contentCol = workflowsSchema.columns.find((c: any) => c.column_name === 'content');
      if (contentCol && contentCol.data_type !== 'jsonb') {
        diagnostics.warnings.push({
          table: 'workflows',
          column: 'content',
          message: `Column type is ${contentCol.data_type}, expected jsonb`,
          impact: 'May cause issues with JSON operations'
        });
      }
    }

    // 4. Sample workflow data to understand structure
    try {
      const sampleWorkflow = await db.execute(sql`
        SELECT id, title, content, created_at 
        FROM workflows 
        LIMIT 1
      `);
      
      if (sampleWorkflow.rows.length > 0) {
        const workflow = sampleWorkflow.rows[0];
        diagnostics.sampleData.workflow = {
          id: workflow.id,
          title: workflow.title,
          hasContent: !!workflow.content,
          contentType: typeof workflow.content,
          contentStructure: workflow.content ? Object.keys(workflow.content) : null
        };

        // Check if workflow content has steps
        if (workflow.content && typeof workflow.content === 'object') {
          const content = workflow.content as any;
          if (content.steps) {
            diagnostics.sampleData.workflow.stepsInContent = true;
            diagnostics.sampleData.workflow.stepCount = content.steps.length;
            diagnostics.sampleData.workflow.firstStepStructure = content.steps[0] ? Object.keys(content.steps[0]) : null;
          }
        }
      }
    } catch (e: any) {
      diagnostics.warnings.push({
        area: 'sample_data',
        message: `Could not fetch sample workflow: ${e.message}`
      });
    }

    // 5. Check for workflow_steps data
    try {
      const workflowStepsCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM workflow_steps
      `);
      
      diagnostics.sampleData.workflowSteps = {
        totalRows: workflowStepsCount.rows[0].count
      };

      if (parseInt(workflowStepsCount.rows[0].count) > 0) {
        const sampleStep = await db.execute(sql`
          SELECT * FROM workflow_steps LIMIT 1
        `);
        if (sampleStep.rows.length > 0) {
          diagnostics.sampleData.workflowSteps.sampleRow = sampleStep.rows[0];
        }
      }
    } catch (e: any) {
      diagnostics.warnings.push({
        area: 'workflow_steps',
        message: `Could not check workflow_steps: ${e.message}`
      });
    }

    // 6. Test the exact failing query
    try {
      const testQuery = await db.execute(sql`
        SELECT 
          w.id,
          w.content,
          ws.data as steps
        FROM workflows w
        LEFT JOIN LATERAL (
          SELECT json_agg(ws.*) as data
          FROM workflow_steps ws
          WHERE ws.workflow_id = w.id
        ) ws ON true
        LIMIT 1
      `);
      
      diagnostics.queryTests = {
        lateralJoinTest: {
          success: true,
          rowCount: testQuery.rows.length
        }
      };
    } catch (e: any) {
      diagnostics.queryTests = {
        lateralJoinTest: {
          success: false,
          error: e.message
        }
      };
    }

    // 7. Analyze the findings and provide recommendations
    if (diagnostics.issues.length > 0) {
      // Check if workflow_steps table is missing or has wrong schema
      const workflowStepsIssue = diagnostics.issues.find((i: any) => i.table === 'workflow_steps' && i.message.includes('step_number'));
      
      if (workflowStepsIssue) {
        diagnostics.recommendations.push({
          priority: 'HIGH',
          issue: 'workflow_steps table is missing step_number column',
          solution: 'Either add the column to the table OR update the code to not use workflow_steps table',
          details: 'The application is trying to query workflow_steps with step_number column, but this column does not exist in the database'
        });
      }

      // Check if we're using workflow steps at all
      if (diagnostics.sampleData.workflowSteps?.totalRows === '0' || diagnostics.sampleData.workflowSteps?.totalRows === 0) {
        diagnostics.recommendations.push({
          priority: 'HIGH',
          issue: 'workflow_steps table is empty',
          solution: 'The application might be storing steps in the workflows.content JSON instead of the workflow_steps table',
          details: 'Check if steps are stored in workflows.content.steps instead of separate table'
        });
      }
    }

    // 8. Check how the application is actually storing workflow data
    if (diagnostics.sampleData.workflow?.stepsInContent) {
      diagnostics.recommendations.push({
        priority: 'MEDIUM',
        finding: 'Workflows store steps in content JSON',
        implication: 'The workflow_steps table might not be used at all',
        recommendation: 'Update queries to read from workflows.content.steps instead of joining workflow_steps table'
      });
    }

    // 9. Final diagnosis
    diagnostics.diagnosis = {
      primaryIssue: diagnostics.issues.find((i: any) => i.severity === 'CRITICAL') || 'No critical issues found',
      likelyRoot: 'The application appears to be using workflows.content JSON for step storage but queries are trying to join workflow_steps table',
      immediateAction: 'Update the formatting QA service to read steps from workflows.content instead of joining workflow_steps'
    };

    return NextResponse.json(diagnostics, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnostic check failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}