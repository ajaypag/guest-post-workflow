import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const diagnosis: any = {
      timestamp: new Date().toISOString(),
      currentSchema: {},
      issues: [],
      fixes: []
    };

    // Get current schema for formatting_qa_checks table
    const currentSchema = await db.execute(sql`
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

    diagnosis.currentSchema = currentSchema.rows;

    // Analyze the failing insert from the error message
    const problematicColumns = [
      'check_description',
      'issues_found', 
      'location_details',
      'fix_suggestions',
      'check_metadata'
    ];

    const textColumns = ['check_description', 'issues_found', 'location_details', 'fix_suggestions'];
    const jsonColumns = ['check_metadata'];

    for (const col of currentSchema.rows) {
      if (problematicColumns.includes(String(col.column_name))) {
        if (textColumns.includes(String(col.column_name))) {
          if (col.data_type === 'character varying' && col.character_maximum_length) {
            diagnosis.issues.push({
              column: col.column_name,
              current: `VARCHAR(${col.character_maximum_length})`,
              problem: `Text content exceeds ${col.character_maximum_length} characters`,
              fix: 'Change to TEXT'
            });
          }
        } else if (jsonColumns.includes(String(col.column_name))) {
          if (col.data_type !== 'jsonb') {
            diagnosis.issues.push({
              column: col.column_name,
              current: col.data_type,
              problem: 'Should be JSONB for JSON data',
              fix: 'Change to JSONB'
            });
          }
        }
      }
    }

    // Test the exact failing data
    const testData = {
      check_description: 'Ensure all required sections exist: Intro, body, FAQ intro, Conclusion',
      issues_found: '',
      location_details: '',
      fix_suggestions: 'No action required – section structure is complete.',
      check_metadata: {
        analysis: 'The article contains: Intro ("Introduction – why …"), multiple body sections (Tier 1, Tier 2, Tier 3, decision checklist), FAQ section with intro heading, Conclusion, and an additional quick-reference appendix. All required sections are present.',
        issueCount: 0
      }
    };

    // Check if this data would fit in current schema
    for (const [key, value] of Object.entries(testData)) {
      const column = currentSchema.rows.find(c => c.column_name === key);
      if (column && column.data_type === 'character varying' && column.character_maximum_length) {
        const valueLength = typeof value === 'string' ? value.length : JSON.stringify(value).length;
        if (valueLength > Number(column.character_maximum_length)) {
          diagnosis.issues.push({
            column: key,
            current: `VARCHAR(${column.character_maximum_length})`,
            problem: `Test data is ${valueLength} chars, exceeds limit of ${column.character_maximum_length}`,
            fix: 'Change to TEXT',
            testValue: typeof value === 'string' ? value : JSON.stringify(value)
          });
        }
      }
    }

    return NextResponse.json(diagnosis, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnosis failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'fix_all_columns') {
      const results = [];
      
      // First, let's check what we're working with
      const currentSchema = await db.execute(sql`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'formatting_qa_checks'
        AND column_name IN ('check_description', 'issues_found', 'location_details', 'fix_suggestions', 'check_metadata')
      `);
      
      results.push({ step: 'current_schema', data: currentSchema.rows });
      
      // Fix each column individually with specific SQL
      const fixes = [
        {
          column: 'check_description',
          sql: `ALTER TABLE formatting_qa_checks ALTER COLUMN check_description TYPE TEXT`
        },
        {
          column: 'issues_found', 
          sql: `ALTER TABLE formatting_qa_checks ALTER COLUMN issues_found TYPE TEXT`
        },
        {
          column: 'location_details',
          sql: `ALTER TABLE formatting_qa_checks ALTER COLUMN location_details TYPE TEXT`
        },
        {
          column: 'fix_suggestions',
          sql: `ALTER TABLE formatting_qa_checks ALTER COLUMN fix_suggestions TYPE TEXT`
        },
        {
          column: 'check_metadata',
          sql: `ALTER TABLE formatting_qa_checks ALTER COLUMN check_metadata TYPE JSONB USING check_metadata::jsonb`
        }
      ];
      
      for (const fix of fixes) {
        try {
          await db.execute(sql.raw(fix.sql));
          results.push({ 
            column: fix.column, 
            success: true, 
            sql: fix.sql,
            message: 'Column altered successfully'
          });
        } catch (error: any) {
          results.push({ 
            column: fix.column, 
            success: false, 
            sql: fix.sql,
            error: error.message 
          });
        }
      }
      
      // Verify the changes
      const newSchema = await db.execute(sql`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'formatting_qa_checks'
        AND column_name IN ('check_description', 'issues_found', 'location_details', 'fix_suggestions', 'check_metadata')
      `);
      
      results.push({ step: 'new_schema', data: newSchema.rows });
      
      // Test insert with the exact failing data
      try {
        const testId = 'test-' + Date.now();
        await db.execute(sql`
          INSERT INTO formatting_qa_checks (
            id, qa_session_id, workflow_id, version, check_number, 
            check_type, check_description, status, issues_found, 
            location_details, confidence_score, fix_suggestions, 
            check_metadata, created_at, updated_at
          ) VALUES (
            ${testId},
            'test-session',
            'test-workflow', 
            1,
            3,
            'section_completeness',
            'Ensure all required sections exist: Intro, body, FAQ intro, Conclusion',
            'passed',
            '',
            '',
            8.5,
            'No action required – section structure is complete.',
            ${{
              analysis: 'The article contains: Intro ("Introduction – why …"), multiple body sections (Tier 1, Tier 2, Tier 3, decision checklist), FAQ section with intro heading, Conclusion, and an additional quick-reference appendix. All required sections are present.',
              issueCount: 0
            }},
            NOW(),
            NOW()
          )
        `);
        
        // Clean up test data
        await db.execute(sql`DELETE FROM formatting_qa_checks WHERE id = ${testId}`);
        
        results.push({ 
          step: 'test_insert', 
          success: true, 
          message: 'Test insert successful - issue should be fixed!'
        });
        
      } catch (error: any) {
        results.push({ 
          step: 'test_insert', 
          success: false, 
          error: error.message,
          message: 'Test insert still failing'
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Column fix operation completed',
        results
      });
    }
    
    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Fix operation failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}