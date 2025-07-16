-- Add formatting QA tables for automated formatting and quality checks

-- Create formatting_qa_sessions table
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
);

-- Create formatting_qa_checks table
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
);

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE "formatting_qa_sessions" ADD CONSTRAINT "formatting_qa_sessions_workflow_id_workflows_id_fk" 
    FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "formatting_qa_checks" ADD CONSTRAINT "formatting_qa_checks_qa_session_id_formatting_qa_sessions_id_fk" 
    FOREIGN KEY ("qa_session_id") REFERENCES "formatting_qa_sessions"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "formatting_qa_checks" ADD CONSTRAINT "formatting_qa_checks_workflow_id_workflows_id_fk" 
    FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "formatting_qa_sessions_workflow_id_idx" ON "formatting_qa_sessions" ("workflow_id");
CREATE INDEX IF NOT EXISTS "formatting_qa_sessions_status_idx" ON "formatting_qa_sessions" ("status");
CREATE INDEX IF NOT EXISTS "formatting_qa_checks_qa_session_id_idx" ON "formatting_qa_checks" ("qa_session_id");
CREATE INDEX IF NOT EXISTS "formatting_qa_checks_workflow_id_idx" ON "formatting_qa_checks" ("workflow_id");
CREATE INDEX IF NOT EXISTS "formatting_qa_checks_status_idx" ON "formatting_qa_checks" ("status");