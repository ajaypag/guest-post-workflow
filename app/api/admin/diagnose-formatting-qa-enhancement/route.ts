import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const diagnosis: any = {
      timestamp: new Date().toISOString(),
      currentState: {},
      enhancementNeeds: [],
      recommendedChanges: [],
      implementationPlan: []
    };

    // 1. Check current formatting_qa_sessions table structure
    const sessionsSchema = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'formatting_qa_sessions'
      ORDER BY ordinal_position
    `);

    diagnosis.currentState.sessionsTable = {
      columns: sessionsSchema.rows,
      hasCleanedArticle: sessionsSchema.rows.some(row => row.column_name === 'cleaned_article'),
      hasFixesApplied: sessionsSchema.rows.some(row => row.column_name === 'fixes_applied')
    };

    // 2. Check current formatting_qa_checks table structure
    const checksSchema = await db.execute(sql`
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

    diagnosis.currentState.checksTable = {
      columns: checksSchema.rows,
      hasFixContent: checksSchema.rows.some(row => row.column_name === 'fix_content'),
      hasWebSearchData: checksSchema.rows.some(row => row.column_name === 'web_search_data')
    };

    // 3. Check current service implementation
    diagnosis.currentState.serviceCapabilities = {
      canAuditOnly: true,
      canFixIssues: false,
      hasWebSearch: false,
      outputsCleanedArticle: false
    };

    // 4. Analyze enhancement needs
    const enhancementNeeds = [
      {
        priority: 'HIGH',
        need: 'Add cleaned_article field to formatting_qa_sessions',
        reason: 'Need to store the AI-fixed version of the article',
        impact: 'Core functionality requirement'
      },
      {
        priority: 'HIGH', 
        need: 'Add web search capability for citation placement',
        reason: 'AI needs to find sources for stats/data in intro',
        impact: 'Enhanced citation placement accuracy'
      },
      {
        priority: 'MEDIUM',
        need: 'Add fixes_applied tracking to sessions',
        reason: 'Track what fixes were applied for debugging',
        impact: 'Better debugging and user understanding'
      },
      {
        priority: 'MEDIUM',
        need: 'Add fix_content field to checks',
        reason: 'Store the specific fix applied for each check',
        impact: 'Detailed fix tracking per check'
      }
    ];

    diagnosis.enhancementNeeds = enhancementNeeds;

    // 5. Generate recommended database changes
    const dbChanges = [];
    
    if (!diagnosis.currentState.sessionsTable.hasCleanedArticle) {
      dbChanges.push({
        type: 'ADD_COLUMN',
        table: 'formatting_qa_sessions',
        sql: 'ALTER TABLE formatting_qa_sessions ADD COLUMN cleaned_article TEXT;',
        description: 'Store the AI-cleaned version of the article'
      });
    }

    if (!diagnosis.currentState.sessionsTable.hasFixesApplied) {
      dbChanges.push({
        type: 'ADD_COLUMN',
        table: 'formatting_qa_sessions', 
        sql: 'ALTER TABLE formatting_qa_sessions ADD COLUMN fixes_applied JSONB;',
        description: 'Track which fixes were applied'
      });
    }

    if (!diagnosis.currentState.checksTable.hasFixContent) {
      dbChanges.push({
        type: 'ADD_COLUMN',
        table: 'formatting_qa_checks',
        sql: 'ALTER TABLE formatting_qa_checks ADD COLUMN fix_content TEXT;',
        description: 'Store the specific fix applied for this check'
      });
    }

    if (!diagnosis.currentState.checksTable.hasWebSearchData) {
      dbChanges.push({
        type: 'ADD_COLUMN',
        table: 'formatting_qa_checks',
        sql: 'ALTER TABLE formatting_qa_checks ADD COLUMN web_search_data JSONB;',
        description: 'Store web search results for citation placement'
      });
    }

    diagnosis.recommendedChanges = dbChanges;

    // 6. Generate implementation plan
    const implementationPlan = [
      {
        phase: 1,
        title: 'Database Schema Updates',
        tasks: [
          'Add cleaned_article column to formatting_qa_sessions',
          'Add fixes_applied column to formatting_qa_sessions',
          'Add fix_content column to formatting_qa_checks',
          'Add web_search_data column to formatting_qa_checks'
        ],
        estimatedTime: '10 minutes',
        riskLevel: 'LOW'
      },
      {
        phase: 2,
        title: 'Agent Enhancement',
        tasks: [
          'Add web search tool integration',
          'Create article fixing tool',
          'Update agent instructions for fixing vs auditing',
          'Refine bold cleanup logic (remove emphasis bolding)',
          'Enhance citation placement with web search'
        ],
        estimatedTime: '45 minutes',
        riskLevel: 'MEDIUM'
      },
      {
        phase: 3,
        title: 'UI Updates',
        tasks: [
          'Add cleaned article display field',
          'Add before/after comparison view',
          'Add MarkdownPreview for cleaned article',
          'Update progress indicators'
        ],
        estimatedTime: '30 minutes',
        riskLevel: 'LOW'
      },
      {
        phase: 4,
        title: 'Testing & Validation',
        tasks: [
          'Test with real long articles',
          'Validate citation placement',
          'Test bold cleanup logic',
          'Verify cleaned article quality'
        ],
        estimatedTime: '20 minutes',
        riskLevel: 'LOW'
      }
    ];

    diagnosis.implementationPlan = implementationPlan;

    // 7. Risk assessment
    diagnosis.riskAssessment = {
      databaseChanges: 'LOW - Adding columns is safe',
      agentChanges: 'MEDIUM - Complex logic changes but well-contained',
      uiChanges: 'LOW - Adding display fields is straightforward',
      overallRisk: 'MEDIUM - Main risk is agent complexity'
    };

    return NextResponse.json(diagnosis, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Enhancement diagnosis failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}