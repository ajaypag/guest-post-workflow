-- Migration: Add metadata column to client_brand_intelligence table
-- Purpose: Store email tokens and client answer submission tracking

ALTER TABLE client_brand_intelligence 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for efficient token lookups
CREATE INDEX IF NOT EXISTS client_brand_intelligence_metadata_answer_token_idx 
ON client_brand_intelligence USING gin ((metadata->'answerToken'));