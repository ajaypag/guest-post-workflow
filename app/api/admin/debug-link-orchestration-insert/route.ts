import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { linkOrchestrationSessions } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const steps = [];
  
  try {
    // Step 1: Test basic database connection
    steps.push({ step: 1, description: 'Testing database connection' });
    const testQuery = await db.execute(sql`SELECT 1 as test`);
    steps.push({ step: 1, result: 'Database connection successful' });

    // Step 2: Check table exists
    steps.push({ step: 2, description: 'Checking if table exists' });
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'link_orchestration_sessions'
      )
    `);
    steps.push({ step: 2, result: `Table exists: ${tableCheck.rows[0]?.exists}` });

    // Step 3: Generate IDs
    steps.push({ step: 3, description: 'Generating UUIDs' });
    const sessionId = uuidv4();
    const workflowId = uuidv4();
    steps.push({ step: 3, result: `Session ID: ${sessionId}, Workflow ID: ${workflowId}` });

    // Step 4: Prepare minimal data
    steps.push({ step: 4, description: 'Preparing minimal insert data' });
    const insertData = {
      id: sessionId,
      workflowId: workflowId,
      version: 1,
      status: 'initializing',
      originalArticle: 'Test article',
      targetDomain: 'example.com',
      clientName: 'Test Client',
      clientUrl: 'https://test.com',
      guestPostSite: 'blog.com',
      targetKeyword: 'test keyword',
      currentPhase: 0
    };
    steps.push({ step: 4, result: 'Data prepared', data: insertData });

    // Step 5: Try the insert
    steps.push({ step: 5, description: 'Attempting insert' });
    
    try {
      const result = await db.insert(linkOrchestrationSessions).values(insertData).returning();
      steps.push({ step: 5, result: 'Insert successful', data: result });
    } catch (insertError: any) {
      steps.push({ 
        step: 5, 
        result: 'Insert failed', 
        error: {
          message: insertError.message,
          code: insertError.code,
          detail: insertError.detail,
          hint: insertError.hint,
          position: insertError.position,
          query: insertError.query,
          parameters: insertError.parameters
        }
      });
      
      // Try raw SQL insert as fallback
      steps.push({ step: 6, description: 'Trying raw SQL insert' });
      try {
        const rawResult = await db.execute(sql`
          INSERT INTO link_orchestration_sessions (
            id, workflow_id, version, status, original_article,
            target_domain, client_name, client_url, guest_post_site,
            target_keyword, current_phase
          ) VALUES (
            ${sessionId}::uuid,
            ${workflowId}::uuid,
            ${1},
            ${'initializing'},
            ${'Test article'},
            ${'example.com'},
            ${'Test Client'},
            ${'https://test.com'},
            ${'blog.com'},
            ${'test keyword'},
            ${0}
          ) RETURNING id
        `);
        steps.push({ step: 6, result: 'Raw SQL insert successful', data: rawResult.rows });
      } catch (rawError: any) {
        steps.push({ 
          step: 6, 
          result: 'Raw SQL insert also failed', 
          error: {
            message: rawError.message,
            code: rawError.code,
            detail: rawError.detail,
            hint: rawError.hint
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Debug process completed',
      steps: steps
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      steps: steps,
      fullError: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail
      }
    }, { status: 500 });
  }
}