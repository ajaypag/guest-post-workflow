import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { WorkflowService } from '@/lib/db/workflowService';
import { ClientService } from '@/lib/db/clientService';
import { UserService } from '@/lib/db/userService';
import { WORKFLOW_STEPS } from '@/types/workflow';
import { requireInternalUser } from '@/lib/auth/middleware';

interface CheckResult {
  section: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: any;
}

export async function POST(request: NextRequest) {
  // Require internal user authentication (internal users have admin privileges)
  const session = await requireInternalUser(request);
  if (session instanceof NextResponse) {
    return session;
  }
  
  // Internal users are effectively admins for database operations
  console.log(`[Database Checker] Admin access granted to internal user: ${session.email}`);
  
  const results: CheckResult[] = [];

  try {
    // 1. Database Connection Test
    try {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        results.push({
          section: 'Database Connection',
          status: 'fail',
          message: 'DATABASE_URL environment variable not set'
        });
        return NextResponse.json({ results });
      }

      const pool = new Pool({
        connectionString,
        ssl: false,
      });

      await pool.query('SELECT 1');
      await pool.end();
      
      results.push({
        section: 'Database Connection',
        status: 'pass',
        message: 'Successfully connected to PostgreSQL database'
      });
    } catch (error) {
      results.push({
        section: 'Database Connection',
        status: 'fail',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // 2. Table Structure Analysis
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false,
      });

      const tables = ['users', 'clients', 'workflows', 'workflow_steps'];
      for (const tableName of tables) {
        const tableCheck = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name = $1 AND table_schema = 'public'
        `, [tableName]);

        if (tableCheck.rows.length > 0) {
          const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position
          `, [tableName]);

          results.push({
            section: `Table: ${tableName}`,
            status: 'pass',
            message: `Table exists with ${columns.rows.length} columns`,
            details: {
              columns: columns.rows.map(col => ({
                name: col.column_name,
                type: col.data_type,
                nullable: col.is_nullable === 'YES',
                default: col.column_default
              }))
            }
          });
        } else {
          results.push({
            section: `Table: ${tableName}`,
            status: 'fail',
            message: `Table '${tableName}' does not exist`
          });
        }
      }

      await pool.end();
    } catch (error) {
      results.push({
        section: 'Table Structure',
        status: 'fail',
        message: `Failed to analyze table structure: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // 3. Data Integrity Check
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false,
      });

      // Check if we have any data
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      const clientCount = await pool.query('SELECT COUNT(*) FROM clients');
      const workflowCount = await pool.query('SELECT COUNT(*) FROM workflows');

      results.push({
        section: 'Data Population',
        status: 'info',
        message: `Found ${userCount.rows[0].count} users, ${clientCount.rows[0].count} clients, ${workflowCount.rows[0].count} workflows`,
        details: {
          users: parseInt(userCount.rows[0].count),
          clients: parseInt(clientCount.rows[0].count),
          workflows: parseInt(workflowCount.rows[0].count)
        }
      });

      await pool.end();
    } catch (error) {
      results.push({
        section: 'Data Population',
        status: 'fail',
        message: `Failed to check data counts: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // 4. Workflow Service Tests
    try {
      // Test workflow creation with sample data
      const sampleWorkflow = {
        id: 'test-workflow-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
        clientName: 'Test Client',
        clientUrl: 'https://example.com',
        targetDomain: 'https://target.com',
        currentStep: 0,
        createdBy: 'Test User',
        steps: WORKFLOW_STEPS.map((step, index) => ({
          id: step.id,
          title: step.title,
          description: step.description,
          status: 'pending' as const,
          inputs: {},
          outputs: {}
        })),
        metadata: {
          pitchKeyword: 'test keyword',
          pitchTopic: 'test topic'
        }
      };

      // Try to create workflow
      const testWorkflow = await WorkflowService.createGuestPostWorkflow(
        sampleWorkflow,
        'test-user-id',
        'Test User'
      );

      results.push({
        section: 'Workflow Creation',
        status: 'pass',
        message: 'Successfully created test workflow',
        details: {
          workflowId: testWorkflow.id,
          stepCount: testWorkflow.steps.length,
          currentStep: testWorkflow.currentStep
        }
      });

      // Try to retrieve workflow
      const retrievedWorkflow = await WorkflowService.getGuestPostWorkflow(testWorkflow.id);
      if (retrievedWorkflow) {
        results.push({
          section: 'Workflow Retrieval',
          status: 'pass',
          message: 'Successfully retrieved workflow from database',
          details: {
            retrievedId: retrievedWorkflow.id,
            stepsPreserved: retrievedWorkflow.steps.length === sampleWorkflow.steps.length,
            metadataPreserved: !!retrievedWorkflow.metadata
          }
        });

        // Check data integrity
        const dataIntegrityIssues = [];
        if (retrievedWorkflow.clientName !== sampleWorkflow.clientName) {
          dataIntegrityIssues.push('clientName mismatch');
        }
        if (retrievedWorkflow.steps.length !== sampleWorkflow.steps.length) {
          dataIntegrityIssues.push('step count mismatch');
        }
        if (!retrievedWorkflow.metadata || !retrievedWorkflow.metadata.pitchKeyword) {
          dataIntegrityIssues.push('metadata not preserved');
        }

        if (dataIntegrityIssues.length > 0) {
          results.push({
            section: 'Data Integrity',
            status: 'warning',
            message: `Data integrity issues found: ${dataIntegrityIssues.join(', ')}`,
            details: {
              issues: dataIntegrityIssues,
              original: sampleWorkflow,
              retrieved: retrievedWorkflow
            }
          });
        } else {
          results.push({
            section: 'Data Integrity',
            status: 'pass',
            message: 'All data preserved correctly during storage and retrieval'
          });
        }
      } else {
        results.push({
          section: 'Workflow Retrieval',
          status: 'fail',
          message: 'Failed to retrieve workflow after creation'
        });
      }

      // Clean up test data
      await WorkflowService.deleteWorkflow(testWorkflow.id);

    } catch (error) {
      results.push({
        section: 'Workflow Service',
        status: 'fail',
        message: `Workflow service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.stack : error
        }
      });
    }

    // 5. Step Data Persistence Test
    try {
      // Create a workflow and test step updates
      const testWorkflow = {
        id: 'step-test-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
        clientName: 'Step Test Client',
        clientUrl: 'https://example.com',
        targetDomain: 'https://target.com',
        currentStep: 0,
        createdBy: 'Test User',
        steps: WORKFLOW_STEPS.slice(0, 3).map((step, index) => ({
          id: step.id,
          title: step.title,
          description: step.description,
          status: 'pending' as const,
          inputs: {},
          outputs: {}
        })),
        metadata: {}
      };

      const createdWorkflow = await WorkflowService.createGuestPostWorkflow(
        testWorkflow,
        'test-user-id',
        'Test User'
      );

      // Test step data updates
      const updatedWorkflow = { ...createdWorkflow };
      updatedWorkflow.steps[0].inputs = { testInput: 'test value' };
      updatedWorkflow.steps[0].outputs = { testOutput: 'test result' };
      updatedWorkflow.steps[0].status = 'completed';
      updatedWorkflow.currentStep = 1;

      // Update workflow
      await WorkflowService.updateWorkflow(updatedWorkflow.id, {
        content: updatedWorkflow,
        updatedAt: new Date()
      });

      // Retrieve and check
      const retrievedUpdated = await WorkflowService.getGuestPostWorkflow(updatedWorkflow.id);
      
      if (retrievedUpdated) {
        const stepDataPreserved = 
          retrievedUpdated.steps[0].inputs?.testInput === 'test value' &&
          retrievedUpdated.steps[0].outputs?.testOutput === 'test result' &&
          retrievedUpdated.steps[0].status === 'completed' &&
          retrievedUpdated.currentStep === 1;

        results.push({
          section: 'Step Data Persistence',
          status: stepDataPreserved ? 'pass' : 'fail',
          message: stepDataPreserved 
            ? 'Step inputs, outputs, and status are properly persisted'
            : 'Step data is not being preserved correctly',
          details: {
            expected: {
              testInput: 'test value',
              testOutput: 'test result',
              status: 'completed',
              currentStep: 1
            },
            actual: {
              testInput: retrievedUpdated.steps[0].inputs?.testInput,
              testOutput: retrievedUpdated.steps[0].outputs?.testOutput,
              status: retrievedUpdated.steps[0].status,
              currentStep: retrievedUpdated.currentStep
            }
          }
        });
      }

      // Clean up
      await WorkflowService.deleteWorkflow(createdWorkflow.id);

    } catch (error) {
      results.push({
        section: 'Step Data Persistence',
        status: 'fail',
        message: `Step persistence test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.stack : error
        }
      });
    }

    // 6. API Endpoint Tests
    const apiTests = [
      { endpoint: '/api/workflows', method: 'GET' },
      { endpoint: '/api/clients', method: 'GET' },
      { endpoint: '/api/users', method: 'GET' }
    ];

    for (const test of apiTests) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}${test.endpoint}`, {
          method: test.method
        });

        results.push({
          section: `API: ${test.method} ${test.endpoint}`,
          status: response.ok ? 'pass' : 'warning',
          message: `Status: ${response.status} ${response.statusText}`,
          details: {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
          }
        });
      } catch (error) {
        results.push({
          section: `API: ${test.method} ${test.endpoint}`,
          status: 'fail',
          message: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // 7. Workflow Step Configuration Check
    results.push({
      section: 'Workflow Configuration',
      status: 'info',
      message: `Workflow configured with ${WORKFLOW_STEPS.length} steps`,
      details: {
        totalSteps: WORKFLOW_STEPS.length,
        stepIds: WORKFLOW_STEPS.map(s => s.id),
        stepTitles: WORKFLOW_STEPS.map(s => s.title)
      }
    });

    return NextResponse.json({ results });

  } catch (error) {
    results.push({
      section: 'System Error',
      status: 'fail',
      message: `Comprehensive check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        error: error instanceof Error ? error.stack : error
      }
    });

    return NextResponse.json({ results });
  }
}