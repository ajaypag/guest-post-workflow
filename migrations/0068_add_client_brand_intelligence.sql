-- Migration 0068: Add Brand Intelligence System
-- Creates client_brand_intelligence table for AI-powered brand research and brief generation
-- Date: 2025-08-23

-- Create client_brand_intelligence table
CREATE TABLE IF NOT EXISTS client_brand_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Deep Research Phase
  research_session_id varchar(255), -- OpenAI Deep Research session ID
  research_status varchar(50) DEFAULT 'idle', -- idle, queued, in_progress, completed, error
  research_started_at timestamp,
  research_completed_at timestamp,
  research_output jsonb, -- Full research results + gap questions
  
  -- Client Input Phase  
  client_input text, -- One-time client response to research gaps
  client_input_at timestamp,
  
  -- Brief Generation Phase
  brief_session_id varchar(255), -- Second AI agent session for synthesis
  brief_status varchar(50) DEFAULT 'idle', -- idle, queued, in_progress, completed, error
  brief_generated_at timestamp,
  final_brief text, -- Generated comprehensive brand brief
  
  -- Metadata
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  -- Constraints
  UNIQUE(client_id) -- One brand intelligence per client
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_client_id ON client_brand_intelligence(client_id);
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_research_status ON client_brand_intelligence(research_status);
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_brief_status ON client_brand_intelligence(brief_status);
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_created_by ON client_brand_intelligence(created_by);

-- Add comments for documentation
COMMENT ON TABLE client_brand_intelligence IS 'Stores AI-powered brand research and intelligence briefs for clients';
COMMENT ON COLUMN client_brand_intelligence.research_session_id IS 'OpenAI Deep Research session ID for tracking long-running operations';
COMMENT ON COLUMN client_brand_intelligence.research_status IS 'Status of deep research phase: idle, queued, in_progress, completed, error';
COMMENT ON COLUMN client_brand_intelligence.research_output IS 'Complete research results including analysis and identified gaps in JSON format';
COMMENT ON COLUMN client_brand_intelligence.client_input IS 'Client response to research gaps - collected once during input phase';
COMMENT ON COLUMN client_brand_intelligence.brief_session_id IS 'AI agent session ID for brief generation phase';
COMMENT ON COLUMN client_brand_intelligence.brief_status IS 'Status of brief generation: idle, queued, in_progress, completed, error';
COMMENT ON COLUMN client_brand_intelligence.final_brief IS 'AI-generated comprehensive brand brief for content creation';