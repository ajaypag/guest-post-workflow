import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Starting formatting QA tables migration...');
    
    // Start transaction
    await db.execute(sql`BEGIN`);
    
    try {
      // Create formatting_qa_sessions table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "formatting_qa_sessions" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "workflow_id" uuid NOT NULL,
          "version" integer DEFAULT 1 NOT NULL,
          "step_id" varchar(100) DEFAULT 'formatting-qa' NOT NULL,
          "status" varchar(50) DEFAULT 'pending' NOT NULL,
          "total_checks" integer DEFAULT 0,
          "passed_checks" integer DEFAULT 0,
          "failed_checks" integer DEFAULT 0,
          "original_article" text,
          "qa_metadata" jsonb,
          "error_message" text,
          "started_at" timestamp,
          "completed_at" timestamp,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      
      // Create formatting_qa_checks table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "formatting_qa_checks" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "qa_session_id" uuid NOT NULL,
          "workflow_id" uuid NOT NULL,
          "version" integer DEFAULT 1 NOT NULL,
          "check_number" integer NOT NULL,
          "check_type" varchar(255) NOT NULL,
          "check_description" text,
          "status" varchar(50) DEFAULT 'pending' NOT NULL,
          "issues_found" text,
          "location_details" text,
          "confidence_score" integer,
          "fix_suggestions" text,
          "check_metadata" jsonb,
          "error_message" text,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      
      // Add foreign key constraints
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE "formatting_qa_sessions" ADD CONSTRAINT "formatting_qa_sessions_workflow_id_workflows_id_fk" 
            FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$
      `);
      
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE "formatting_qa_checks" ADD CONSTRAINT "formatting_qa_checks_qa_session_id_formatting_qa_sessions_id_fk" 
            FOREIGN KEY ("qa_session_id") REFERENCES "formatting_qa_sessions"("id") ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$
      `);
      
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE "formatting_qa_checks" ADD CONSTRAINT "formatting_qa_checks_workflow_id_workflows_id_fk" 
            FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$
      `);
      
      // Create indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "formatting_qa_sessions_workflow_id_idx" ON "formatting_qa_sessions" ("workflow_id");
        CREATE INDEX IF NOT EXISTS "formatting_qa_sessions_status_idx" ON "formatting_qa_sessions" ("status");
        CREATE INDEX IF NOT EXISTS "formatting_qa_checks_qa_session_id_idx" ON "formatting_qa_checks" ("qa_session_id");
        CREATE INDEX IF NOT EXISTS "formatting_qa_checks_workflow_id_idx" ON "formatting_qa_checks" ("workflow_id");
        CREATE INDEX IF NOT EXISTS "formatting_qa_checks_status_idx" ON "formatting_qa_checks" ("status");
      `);
      
      // Commit transaction
      await db.execute(sql`COMMIT`);
      
      console.log('Formatting QA tables migration completed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Formatting QA tables created successfully'
      });
      
    } catch (error) {
      // Rollback on error
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
    
  } catch (error: any) {
    console.error('Error creating formatting QA tables:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('Starting formatting QA tables rollback...');
    
    // Start transaction
    await db.execute(sql`BEGIN`);
    
    try {
      // Drop tables in correct order (checks first due to foreign key)
      await db.execute(sql`DROP TABLE IF EXISTS "formatting_qa_checks" CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS "formatting_qa_sessions" CASCADE`);
      
      // Commit transaction
      await db.execute(sql`COMMIT`);
      
      console.log('Formatting QA tables rollback completed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Formatting QA tables removed successfully'
      });
      
    } catch (error) {
      // Rollback on error
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
    
  } catch (error: any) {
    console.error('Error removing formatting QA tables:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}