import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST() {
  try {
    console.log('Starting link orchestration schema fix...');

    // First, check if the table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'link_orchestration_sessions'
      )
    `);

    if (!tableExists.rows[0]?.exists) {
      // Create the table with the correct schema
      await db.execute(sql`
        CREATE TABLE link_orchestration_sessions (
          id UUID PRIMARY KEY,
          workflow_id VARCHAR(255) NOT NULL,
          version INTEGER DEFAULT 1,
          status VARCHAR(50) DEFAULT 'initializing',
          current_phase INTEGER DEFAULT 0,
          
          -- Phase timestamps
          phase1_start TIMESTAMP,
          phase1_complete TIMESTAMP,
          phase2_start TIMESTAMP,
          phase2_complete TIMESTAMP,
          phase3_start TIMESTAMP,
          phase3_complete TIMESTAMP,
          
          -- Article versions
          original_article TEXT NOT NULL,
          article_after_phase1 TEXT,
          article_after_phase2 TEXT,
          final_article TEXT,
          
          -- Configuration
          target_domain VARCHAR(255) NOT NULL,
          client_name VARCHAR(255) NOT NULL,
          client_url VARCHAR(255) NOT NULL,
          anchor_text VARCHAR(255),
          guest_post_site VARCHAR(255) NOT NULL,
          target_keyword VARCHAR(255) NOT NULL,
          
          -- Results (using TEXT instead of JSON for compatibility)
          phase1_results TEXT,
          phase2_results TEXT,
          phase3_results TEXT,
          
          -- Individual results
          internal_links_result TEXT,
          client_mention_result TEXT,
          client_link_result TEXT,
          client_link_conversation TEXT,
          
          -- Phase 3 outputs
          image_strategy TEXT,
          link_requests TEXT,
          url_suggestion TEXT,
          
          -- Error tracking
          error_message TEXT,
          error_details TEXT,
          
          -- Timestamps
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP,
          failed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index on workflow_id for faster lookups
      await db.execute(sql`
        CREATE INDEX idx_link_orchestration_workflow_id 
        ON link_orchestration_sessions(workflow_id)
      `);

      // Create index on status for monitoring
      await db.execute(sql`
        CREATE INDEX idx_link_orchestration_status 
        ON link_orchestration_sessions(status)
      `);

      return NextResponse.json({
        success: true,
        message: 'Link orchestration table created successfully',
        action: 'created'
      });
    } else {
      // Table exists, let's check if we need to add any missing columns
      const columns = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'link_orchestration_sessions'
      `);
      
      const existingColumns = new Set(columns.rows.map(r => r.column_name));
      const requiredColumns = [
        'id', 'workflow_id', 'version', 'status', 'current_phase',
        'phase1_start', 'phase1_complete', 'phase2_start', 'phase2_complete',
        'phase3_start', 'phase3_complete', 'original_article', 'article_after_phase1',
        'article_after_phase2', 'final_article', 'target_domain', 'client_name',
        'client_url', 'anchor_text', 'guest_post_site', 'target_keyword',
        'phase1_results', 'phase2_results', 'phase3_results', 'internal_links_result',
        'client_mention_result', 'client_link_result', 'client_link_conversation',
        'image_strategy', 'link_requests', 'url_suggestion', 'error_message',
        'error_details', 'started_at', 'completed_at', 'failed_at', 'created_at', 'updated_at'
      ];

      const missingColumns = requiredColumns.filter(col => !existingColumns.has(col));

      if (missingColumns.length > 0) {
        // Add missing columns
        for (const column of missingColumns) {
          let columnDef = '';
          
          // Define column types based on column name
          if (column.includes('_at')) {
            columnDef = 'TIMESTAMP';
          } else if (column.includes('phase') && column.includes('_results')) {
            columnDef = 'TEXT';
          } else if (column.includes('article') || column.includes('_result') || 
                     column.includes('strategy') || column.includes('requests') || 
                     column.includes('error') || column.includes('conversation')) {
            columnDef = 'TEXT';
          } else if (column === 'version' || column === 'current_phase') {
            columnDef = 'INTEGER DEFAULT 0';
          } else if (column === 'status') {
            columnDef = "VARCHAR(50) DEFAULT 'initializing'";
          } else {
            columnDef = 'VARCHAR(255)';
          }

          try {
            await db.execute(sql`
              ALTER TABLE link_orchestration_sessions 
              ADD COLUMN IF NOT EXISTS ${sql.identifier(column)} ${sql.raw(columnDef)}
            `);
          } catch (e) {
            console.log(`Column ${column} might already exist or failed to add:`, e);
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Link orchestration table updated with missing columns',
          action: 'updated',
          missingColumns
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'Link orchestration table schema is up to date',
          action: 'no_changes_needed'
        });
      }
    }
  } catch (error: any) {
    console.error('Schema fix error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix schema',
      details: error.message,
      hint: error.hint,
      code: error.code
    }, { status: 500 });
  }
}