-- Create article_sections table for agentic workflow
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

-- Create agent_sessions table for tracking agentic workflows
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

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "article_sections" ADD CONSTRAINT "article_sections_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;