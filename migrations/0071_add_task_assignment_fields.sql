-- ============================================================================
-- MIGRATION 0071: Add Task Assignment Fields
-- Date: 2025-08-27
-- Purpose: Add assignment fields to support task management system integration
-- 
-- This migration adds assignment tracking to brand intelligence and ensures
-- vetted sites requests can be properly assigned via the task management system
-- ============================================================================

-- ============================================================================
-- BRAND INTELLIGENCE ASSIGNMENT
-- ============================================================================

-- Add assignment field to client_brand_intelligence
ALTER TABLE client_brand_intelligence 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

-- Add assignment timestamp
ALTER TABLE client_brand_intelligence 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

-- Add assignment notes
ALTER TABLE client_brand_intelligence 
ADD COLUMN IF NOT EXISTS assignment_notes TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_assigned_to 
ON client_brand_intelligence(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================================================
-- DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON COLUMN client_brand_intelligence.assigned_to IS 'User assigned to complete the brand intelligence workflow';
COMMENT ON COLUMN client_brand_intelligence.assigned_at IS 'Timestamp when the brand intelligence was assigned';
COMMENT ON COLUMN client_brand_intelligence.assignment_notes IS 'Notes provided during assignment';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify columns were added
/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_brand_intelligence'
  AND column_name IN ('assigned_to', 'assigned_at', 'assignment_notes')
ORDER BY column_name;
*/

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- TO ROLLBACK THIS MIGRATION (if needed):
/*
-- Drop index
DROP INDEX IF EXISTS idx_client_brand_intelligence_assigned_to;

-- Remove columns
ALTER TABLE client_brand_intelligence
DROP COLUMN IF EXISTS assigned_to,
DROP COLUMN IF EXISTS assigned_at,
DROP COLUMN IF EXISTS assignment_notes;
*/

-- ============================================================================
-- EXPECTED IMPACT
-- ============================================================================

-- Performance Impact: Minimal (sparse index on assigned_to)
-- Storage Impact: ~50 bytes per brand intelligence record
-- Data Impact: No existing data modified, only additive changes
-- Downtime: None (additive changes only)