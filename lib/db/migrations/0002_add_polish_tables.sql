-- Add semantic audit sessions table for semantic SEO audit workflows
CREATE TABLE IF NOT EXISTS "semantic_audit_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"step_id" varchar(100) DEFAULT 'content-audit' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"total_sections" integer DEFAULT 0,
	"completed_sections" integer DEFAULT 0,
	"original_article" text,
	"research_context" text,
	"audit_metadata" jsonb,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

-- Add semantic audit sections table for tracking section-by-section audit
CREATE TABLE IF NOT EXISTS "semantic_audit_sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"audit_session_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"section_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"original_content" text,
	"optimized_content" text,
	"seo_analysis" text,
	"improvements" text,
	"keyword_density" jsonb,
	"readability_score" integer,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"audit_metadata" jsonb,
	"error_message" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

-- Add polish sessions table for final polish workflows  
CREATE TABLE IF NOT EXISTS "polish_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"step_id" varchar(100) DEFAULT 'final-polish' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"total_sections" integer DEFAULT 0,
	"completed_sections" integer DEFAULT 0,
	"original_article" text,
	"research_context" text,
	"brand_conflicts_found" integer DEFAULT 0,
	"polish_metadata" jsonb,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

-- Add polish sections table for tracking section-by-section final polish
CREATE TABLE IF NOT EXISTS "polish_sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"polish_session_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"section_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"original_content" text,
	"polished_content" text,
	"strengths" text,
	"weaknesses" text,
	"brand_conflicts" text,
	"polish_approach" varchar(100),
	"engagement_score" integer,
	"clarity_score" integer,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"polish_metadata" jsonb,
	"error_message" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "semantic_audit_sessions" ADD CONSTRAINT "semantic_audit_sessions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "semantic_audit_sections" ADD CONSTRAINT "semantic_audit_sections_audit_session_id_semantic_audit_sessions_id_fk" FOREIGN KEY ("audit_session_id") REFERENCES "semantic_audit_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "semantic_audit_sections" ADD CONSTRAINT "semantic_audit_sections_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "polish_sessions" ADD CONSTRAINT "polish_sessions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "polish_sections" ADD CONSTRAINT "polish_sections_polish_session_id_polish_sessions_id_fk" FOREIGN KEY ("polish_session_id") REFERENCES "polish_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "polish_sections" ADD CONSTRAINT "polish_sections_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;