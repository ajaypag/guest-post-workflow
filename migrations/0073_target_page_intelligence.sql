-- Migration 0073: Target Page Intelligence
-- Creates intelligence system for individual target pages (copy of brand intelligence)
-- Author: Claude
-- Date: 2025-08-27

-- Create target_page_intelligence table (exact copy of client_brand_intelligence structure)
CREATE TABLE IF NOT EXISTS target_page_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES target_pages(id) ON DELETE CASCADE,
  
  -- Research phase (identical to brand intelligence)
  research_session_id VARCHAR(255),
  research_status VARCHAR(50) DEFAULT 'idle',
  research_started_at TIMESTAMP,
  research_completed_at TIMESTAMP,
  research_output JSONB,
  
  -- Client input phase (identical to brand intelligence)
  client_input TEXT,
  client_input_at TIMESTAMP,
  
  -- Brief generation phase (identical to brand intelligence)
  brief_session_id VARCHAR(255),
  brief_status VARCHAR(50) DEFAULT 'idle',
  brief_generated_at TIMESTAMP,
  final_brief TEXT,
  
  -- Metadata and tracking (identical to brand intelligence)
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- One intelligence per target page
  CONSTRAINT unique_target_page_intelligence UNIQUE(target_page_id)
);

-- Create indexes matching brand intelligence structure
CREATE INDEX idx_target_page_intelligence_client_id ON target_page_intelligence(client_id);
CREATE INDEX idx_target_page_intelligence_target_page_id ON target_page_intelligence(target_page_id);
CREATE INDEX idx_target_page_intelligence_research_status ON target_page_intelligence(research_status);
CREATE INDEX idx_target_page_intelligence_brief_status ON target_page_intelligence(brief_status);
CREATE INDEX idx_target_page_intelligence_created_by ON target_page_intelligence(created_by);

-- Add metadata index for answer tokens (same as brand intelligence)
CREATE INDEX target_page_intelligence_metadata_answer_token_idx 
  ON target_page_intelligence USING gin ((metadata -> 'answerToken'::text));

-- Add comment for documentation
COMMENT ON TABLE target_page_intelligence IS 'Deep research and brief generation for specific target pages, following same 3-phase process as brand intelligence';
COMMENT ON COLUMN target_page_intelligence.target_page_id IS 'References the specific target page this intelligence is for';
COMMENT ON COLUMN target_page_intelligence.research_output IS 'JSON structure identical to brand intelligence research output';
COMMENT ON COLUMN target_page_intelligence.metadata IS 'Stores answer tokens, edited research, and other metadata like brand intelligence';