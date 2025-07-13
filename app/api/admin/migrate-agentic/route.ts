import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST() {
  try {
    console.log('🟡 Starting agentic workflow tables migration...');

    // Check if tables already exist
    const checkArticleSections = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'article_sections';
    `);

    const checkAgentSessions = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'agent_sessions';
    `);

    if ((checkArticleSections.rows && checkArticleSections.rows.length > 0) ||
        (checkAgentSessions.rows && checkAgentSessions.rows.length > 0)) {
      return NextResponse.json({
        success: false,
        error: 'Agentic workflow tables already exist'
      });
    }

    // Create article_sections table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "article_sections" (
        "id" uuid PRIMARY KEY NOT NULL,
        "workflow_id" uuid NOT NULL,
        "section_number" integer NOT NULL,
        "title" varchar(255) NOT NULL,
        "content" text,
        "word_count" integer DEFAULT 0,
        "status" varchar(50) DEFAULT 'pending' NOT NULL,
        "agent_conversation_id" varchar(255),
        "generation_metadata" jsonb,
        "error_message" text,
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp NOT NULL
      );
    `);

    // Create agent_sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "agent_sessions" (
        "id" uuid PRIMARY KEY NOT NULL,
        "workflow_id" uuid NOT NULL,
        "step_id" varchar(100) NOT NULL,
        "status" varchar(50) DEFAULT 'pending' NOT NULL,
        "agent_id" varchar(255),
        "conversation_id" varchar(255),
        "total_sections" integer DEFAULT 0,
        "completed_sections" integer DEFAULT 0,
        "target_word_count" integer,
        "current_word_count" integer DEFAULT 0,
        "outline" text,
        "session_metadata" jsonb,
        "error_message" text,
        "started_at" timestamp,
        "completed_at" timestamp,
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp NOT NULL
      );
    `);

    // Add foreign key constraints
    await db.execute(`
      DO $$ BEGIN
       ALTER TABLE "article_sections" ADD CONSTRAINT "article_sections_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(`
      DO $$ BEGIN
       ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Agentic workflow tables migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Agentic workflow tables (article_sections, agent_sessions) created successfully'
    });

  } catch (error: any) {
    console.error('🔴 Error during agentic workflow tables migration:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create agentic workflow tables', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🟡 Starting agentic workflow tables rollback...');

    // Check if tables exist
    const checkArticleSections = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'article_sections';
    `);

    const checkAgentSessions = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'agent_sessions';
    `);

    if ((!checkArticleSections.rows || checkArticleSections.rows.length === 0) &&
        (!checkAgentSessions.rows || checkAgentSessions.rows.length === 0)) {
      return NextResponse.json({
        success: false,
        error: 'Agentic workflow tables do not exist'
      });
    }

    // Drop tables (foreign keys will be dropped automatically)
    await db.execute(`DROP TABLE IF EXISTS "article_sections" CASCADE;`);
    await db.execute(`DROP TABLE IF EXISTS "agent_sessions" CASCADE;`);

    console.log('✅ Agentic workflow tables rollback completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Agentic workflow tables removed successfully'
    });

  } catch (error: any) {
    console.error('🔴 Error during agentic workflow tables rollback:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to remove agentic workflow tables', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}