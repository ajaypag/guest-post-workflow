import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'test_exact_failing_insert') {
      const results = [];
      
      // Get current schema for reference
      const schemaResult = await db.execute(sql`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'formatting_qa_checks'
        ORDER BY ordinal_position
      `);
      
      results.push({
        step: 'current_schema',
        data: schemaResult.rows
      });
      
      // Test the exact failing INSERT with the exact values from your error
      const testData = {
        id: 'ba902558-a03b-4591-a08e-5386918e67a8',
        qa_session_id: '3022b809-cdff-4433-9722-9e12ed4d24bf',
        workflow_id: 'bc645a39-bcd9-404a-99e7-42baa8a072fc',
        version: 3,
        check_number: 3,
        check_type: 'section_completeness',
        check_description: 'Ensure all required sections exist: Intro, body, FAQ intro, Conclusion',
        status: 'passed',
        issues_found: '',
        location_details: '',
        confidence_score: 8.5, // This is the problem - decimal in integer column
        fix_suggestions: 'No action required – section structure is complete.',
        check_metadata: {
          analysis: 'The article contains: Intro ("Introduction – why …"), multiple body sections (Tier 1, Tier 2, Tier 3, decision checklist), FAQ section with intro heading, Conclusion, and an additional quick-reference appendix. All required sections are present.',
          issueCount: 0
        },
        error_message: null, // This might be the problem if column is NOT NULL
        created_at: new Date('2025-07-16T15:21:36.560Z'),
        updated_at: new Date('2025-07-16T15:21:36.560Z')
      };
      
      // Try the exact failing insert
      try {
        await db.execute(sql`
          INSERT INTO formatting_qa_checks (
            id, qa_session_id, workflow_id, version, check_number, 
            check_type, check_description, status, issues_found, 
            location_details, confidence_score, fix_suggestions, 
            check_metadata, error_message, created_at, updated_at
          ) VALUES (
            ${testData.id},
            ${testData.qa_session_id},
            ${testData.workflow_id},
            ${testData.version},
            ${testData.check_number},
            ${testData.check_type},
            ${testData.check_description},
            ${testData.status},
            ${testData.issues_found},
            ${testData.location_details},
            ${testData.confidence_score},
            ${testData.fix_suggestions},
            ${testData.check_metadata},
            ${testData.error_message},
            ${testData.created_at},
            ${testData.updated_at}
          )
        `);
        
        results.push({
          step: 'test_exact_insert',
          success: true,
          message: 'Insert succeeded - this is unexpected!'
        });
        
        // Clean up test data
        await db.execute(sql`DELETE FROM formatting_qa_checks WHERE id = ${testData.id}`);
        
      } catch (insertError: any) {
        results.push({
          step: 'test_exact_insert',
          success: false,
          error: insertError.message,
          postgresError: {
            code: insertError.code,
            detail: insertError.detail,
            hint: insertError.hint,
            position: insertError.position,
            severity: insertError.severity,
            line: insertError.line,
            routine: insertError.routine
          },
          diagnosis: 'This is the exact error from your failing insert'
        });
      }
      
      // Now try with fixes applied
      const fixedData = {
        ...testData,
        id: 'test-fixed-' + Date.now(),
        confidence_score: Math.round(testData.confidence_score), // Fix 1: Round to integer
        error_message: '' // Fix 2: Use empty string instead of null
      };
      
      try {
        await db.execute(sql`
          INSERT INTO formatting_qa_checks (
            id, qa_session_id, workflow_id, version, check_number, 
            check_type, check_description, status, issues_found, 
            location_details, confidence_score, fix_suggestions, 
            check_metadata, error_message, created_at, updated_at
          ) VALUES (
            ${fixedData.id},
            ${fixedData.qa_session_id},
            ${fixedData.workflow_id},
            ${fixedData.version},
            ${fixedData.check_number},
            ${fixedData.check_type},
            ${fixedData.check_description},
            ${fixedData.status},
            ${fixedData.issues_found},
            ${fixedData.location_details},
            ${fixedData.confidence_score},
            ${fixedData.fix_suggestions},
            ${fixedData.check_metadata},
            ${fixedData.error_message},
            ${fixedData.created_at},
            ${fixedData.updated_at}
          )
        `);
        
        results.push({
          step: 'test_fixed_insert',
          success: true,
          message: 'Fixed insert succeeded!',
          fixes: [
            `confidence_score: ${testData.confidence_score} → ${fixedData.confidence_score} (rounded to integer)`,
            `error_message: null → '' (empty string instead of null)`
          ]
        });
        
        // Clean up test data
        await db.execute(sql`DELETE FROM formatting_qa_checks WHERE id = ${fixedData.id}`);
        
      } catch (fixedError: any) {
        results.push({
          step: 'test_fixed_insert',
          success: false,
          error: fixedError.message,
          postgresError: {
            code: fixedError.code,
            detail: fixedError.detail,
            hint: fixedError.hint
          },
          message: 'Fixed insert still failed - there may be other issues'
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Insert test completed',
        results,
        recommendations: [
          'Fix 1: Change confidence_score from decimal to integer (round the value)',
          'Fix 2: Change error_message from null to empty string or make column nullable',
          'Apply these fixes to agenticFormattingQAService.ts'
        ]
      });
    }
    
    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}