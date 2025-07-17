import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('🔍 Checking streaming schema migration status...');

    const result = {
      timestamp: new Date().toISOString(),
      schemaStatus: {
        hasStreamingFields: false,
        hasUniqueConstraint: false,
        currentColumns: [] as any[],
        currentIndexes: [] as any[]
      },
      analysis: {
        issues: [] as string[],
        recommendations: [] as string[],
        migrationNeeded: false
      },
      testResults: {
        uniqueConstraintTest: null as any,
        columnAccessTest: null as any
      }
    };

    // Check current table structure
    const columnInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'outline_sessions'
      ORDER BY ordinal_position
    `);

    result.schemaStatus.currentColumns = columnInfo.rows;

    // Check for streaming-specific columns
    const columnNames = columnInfo.rows.map((col: any) => col.column_name);
    const streamingFields = [
      'last_sequence_number',
      'connection_status', 
      'stream_started_at',
      'partial_content'
    ];

    const missingFields = streamingFields.filter(field => !columnNames.includes(field));
    result.schemaStatus.hasStreamingFields = missingFields.length === 0;

    if (missingFields.length > 0) {
      result.analysis.issues.push(`Missing streaming fields: ${missingFields.join(', ')}`);
      result.analysis.migrationNeeded = true;
    }

    // Check current indexes
    const indexInfo = await db.execute(sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'outline_sessions'
    `);

    result.schemaStatus.currentIndexes = indexInfo.rows;

    // Check for unique constraint
    const hasUniqueConstraint = indexInfo.rows.some((idx: any) => 
      idx.indexname === 'uniq_outline_active_per_workflow' ||
      (idx.indexdef?.includes('UNIQUE') && idx.indexdef?.includes('workflow_id') && idx.indexdef?.includes('is_active'))
    );

    result.schemaStatus.hasUniqueConstraint = hasUniqueConstraint;

    if (!hasUniqueConstraint) {
      result.analysis.issues.push('Missing unique constraint to prevent race conditions');
      result.analysis.migrationNeeded = true;
    }

    // Test for existing constraint violations (if we were to add the constraint)
    try {
      const duplicateActiveCheck = await db.execute(sql`
        SELECT workflow_id, COUNT(*) as active_count
        FROM outline_sessions
        WHERE is_active = true
        GROUP BY workflow_id
        HAVING COUNT(*) > 1
      `);

      if (duplicateActiveCheck.rows.length > 0) {
        result.analysis.issues.push(`Found ${duplicateActiveCheck.rows.length} workflows with multiple active sessions`);
        result.testResults.uniqueConstraintTest = {
          canAddConstraint: false,
          conflicts: duplicateActiveCheck.rows
        };
      } else {
        result.testResults.uniqueConstraintTest = {
          canAddConstraint: true,
          conflicts: []
        };
      }
    } catch (error: any) {
      result.testResults.uniqueConstraintTest = {
        error: error.message
      };
    }

    // Generate recommendations
    if (result.analysis.migrationNeeded) {
      result.analysis.recommendations.push(
        'Run database migration to add streaming support fields',
        'Add unique constraint to prevent race conditions',
        'Test constraint with current data before applying'
      );

      if (result.testResults.uniqueConstraintTest?.conflicts?.length > 0) {
        result.analysis.recommendations.push(
          'Clean up duplicate active sessions before adding unique constraint'
        );
      }
    } else {
      result.analysis.recommendations.push('Schema is ready for streaming migration');
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Error checking streaming schema:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check schema',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    console.log('🚀 Starting streaming schema migration...');

    const migrationSteps = [];
    const results = {
      timestamp: new Date().toISOString(),
      steps: [] as any[],
      success: false,
      rollbackInstructions: [] as string[]
    };

    // Step 1: Clean up any duplicate active sessions
    console.log('Step 1: Cleaning up duplicate active sessions...');
    const cleanupResult = await db.execute(sql`
      UPDATE outline_sessions 
      SET is_active = false,
          updated_at = NOW(),
          error_message = COALESCE(error_message, 'Cleaned up during streaming migration')
      WHERE id IN (
        SELECT id FROM (
          SELECT id, 
                 ROW_NUMBER() OVER (PARTITION BY workflow_id ORDER BY created_at DESC) as rn
          FROM outline_sessions
          WHERE is_active = true
        ) ranked
        WHERE rn > 1
      )
    `);

    results.steps.push({
      step: 1,
      action: 'cleanup_duplicates',
      success: true,
      details: `Cleaned up duplicate active sessions`,
      rowsAffected: cleanupResult.rowCount || 0
    });

    // Step 2: Add streaming support columns
    console.log('Step 2: Adding streaming support columns...');
    
    const addColumnsQueries = [
      sql`ALTER TABLE outline_sessions ADD COLUMN IF NOT EXISTS last_sequence_number INTEGER DEFAULT 0`,
      sql`ALTER TABLE outline_sessions ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50) DEFAULT 'disconnected'`,
      sql`ALTER TABLE outline_sessions ADD COLUMN IF NOT EXISTS stream_started_at TIMESTAMP`,
      sql`ALTER TABLE outline_sessions ADD COLUMN IF NOT EXISTS partial_content TEXT`
    ];

    for (const [index, query] of addColumnsQueries.entries()) {
      try {
        await db.execute(query);
        results.steps.push({
          step: `2.${index + 1}`,
          action: 'add_column',
          success: true,
          details: `Added streaming column ${index + 1}/4`
        });
      } catch (error: any) {
        // Column might already exist, check if it's just a "already exists" error
        if (error.message.includes('already exists')) {
          results.steps.push({
            step: `2.${index + 1}`,
            action: 'add_column',
            success: true,
            details: `Column already exists (skipped)`
          });
        } else {
          throw error;
        }
      }
    }

    // Step 3: Add unique constraint
    console.log('Step 3: Adding unique constraint...');
    
    try {
      await db.execute(sql`
        CREATE UNIQUE INDEX CONCURRENTLY uniq_outline_active_per_workflow
        ON outline_sessions(workflow_id)
        WHERE is_active = true
      `);

      results.steps.push({
        step: 3,
        action: 'add_unique_constraint',
        success: true,
        details: 'Added unique constraint to prevent race conditions'
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        results.steps.push({
          step: 3,
          action: 'add_unique_constraint',
          success: true,
          details: 'Unique constraint already exists (skipped)'
        });
      } else {
        // This is a critical error - rollback previous steps
        results.steps.push({
          step: 3,
          action: 'add_unique_constraint',
          success: false,
          error: error.message
        });
        throw error;
      }
    }

    // Step 4: Verify migration
    console.log('Step 4: Verifying migration...');
    
    const verificationQuery = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'outline_sessions'
      AND column_name IN ('last_sequence_number', 'connection_status', 'stream_started_at', 'partial_content')
    `);

    const verificationIndexQuery = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'outline_sessions'
      AND indexname = 'uniq_outline_active_per_workflow'
    `);

    const hasAllColumns = verificationQuery.rows.length === 4;
    const hasConstraint = verificationIndexQuery.rows.length === 1;

    if (hasAllColumns && hasConstraint) {
      results.steps.push({
        step: 4,
        action: 'verify_migration',
        success: true,
        details: 'All columns and constraints verified successfully'
      });
      results.success = true;
    } else {
      results.steps.push({
        step: 4,
        action: 'verify_migration',
        success: false,
        details: `Missing columns: ${!hasAllColumns}, Missing constraint: ${!hasConstraint}`
      });
    }

    // Add rollback instructions
    results.rollbackInstructions = [
      'DROP INDEX IF EXISTS uniq_outline_active_per_workflow;',
      'ALTER TABLE outline_sessions DROP COLUMN IF EXISTS partial_content;',
      'ALTER TABLE outline_sessions DROP COLUMN IF EXISTS stream_started_at;',
      'ALTER TABLE outline_sessions DROP COLUMN IF EXISTS connection_status;',
      'ALTER TABLE outline_sessions DROP COLUMN IF EXISTS last_sequence_number;'
    ];

    console.log('✅ Streaming schema migration completed');
    return NextResponse.json(results);

  } catch (error: any) {
    console.error('❌ Error during streaming schema migration:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error.message,
        timestamp: new Date().toISOString(),
        rollbackRequired: true
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🗑️ Rolling back streaming schema migration...');

    const rollbackSteps = [
      {
        name: 'Remove unique constraint',
        query: sql`DROP INDEX IF EXISTS uniq_outline_active_per_workflow`
      },
      {
        name: 'Remove partial_content column',
        query: sql`ALTER TABLE outline_sessions DROP COLUMN IF EXISTS partial_content`
      },
      {
        name: 'Remove stream_started_at column',
        query: sql`ALTER TABLE outline_sessions DROP COLUMN IF EXISTS stream_started_at`
      },
      {
        name: 'Remove connection_status column',
        query: sql`ALTER TABLE outline_sessions DROP COLUMN IF EXISTS connection_status`
      },
      {
        name: 'Remove last_sequence_number column',
        query: sql`ALTER TABLE outline_sessions DROP COLUMN IF EXISTS last_sequence_number`
      }
    ];

    const results = {
      timestamp: new Date().toISOString(),
      steps: [] as any[],
      success: false
    };

    for (const [index, step] of rollbackSteps.entries()) {
      try {
        await db.execute(step.query);
        results.steps.push({
          step: index + 1,
          action: step.name,
          success: true
        });
      } catch (error: any) {
        results.steps.push({
          step: index + 1,
          action: step.name,
          success: false,
          error: error.message
        });
      }
    }

    results.success = results.steps.every(step => step.success);

    console.log('✅ Streaming schema rollback completed');
    return NextResponse.json(results);

  } catch (error: any) {
    console.error('❌ Error during rollback:', error);
    return NextResponse.json(
      { 
        error: 'Rollback failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}