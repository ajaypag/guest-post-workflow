-- Fix project count calculations for 4-tier qualification system

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_project_stats_trigger ON bulk_analysis_domains;
DROP FUNCTION IF EXISTS update_project_stats();

-- Create updated function that counts all qualified statuses (high, good, marginal)
CREATE OR REPLACE FUNCTION update_project_stats() RETURNS TRIGGER AS $$
BEGIN
  -- Update counts for NEW project
  IF NEW.project_id IS NOT NULL THEN
    UPDATE bulk_analysis_projects SET
      domain_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = NEW.project_id),
      qualified_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = NEW.project_id AND qualification_status IN ('high_quality', 'good_quality', 'marginal_quality')),
      workflow_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = NEW.project_id AND has_workflow = true),
      last_activity_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  
  -- Also update old project if domain moved
  IF TG_OP = 'UPDATE' AND OLD.project_id IS NOT NULL AND OLD.project_id != NEW.project_id THEN
    UPDATE bulk_analysis_projects SET
      domain_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id),
      qualified_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND qualification_status IN ('high_quality', 'good_quality', 'marginal_quality')),
      workflow_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND has_workflow = true)
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle DELETE operations
CREATE OR REPLACE FUNCTION update_project_stats_on_delete() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.project_id IS NOT NULL THEN
    UPDATE bulk_analysis_projects SET
      domain_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id),
      qualified_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND qualification_status IN ('high_quality', 'good_quality', 'marginal_quality')),
      workflow_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND has_workflow = true)
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_project_stats_trigger
AFTER INSERT OR UPDATE ON bulk_analysis_domains
FOR EACH ROW EXECUTE FUNCTION update_project_stats();

CREATE TRIGGER update_project_stats_on_delete_trigger
AFTER DELETE ON bulk_analysis_domains
FOR EACH ROW EXECUTE FUNCTION update_project_stats_on_delete();

-- Recalculate all project counts to fix existing data
UPDATE bulk_analysis_projects p SET
  domain_count = (
    SELECT COUNT(*) FROM bulk_analysis_domains d 
    WHERE d.project_id = p.id
  ),
  qualified_count = (
    SELECT COUNT(*) FROM bulk_analysis_domains d 
    WHERE d.project_id = p.id 
    AND d.qualification_status IN ('high_quality', 'good_quality', 'marginal_quality')
  ),
  workflow_count = (
    SELECT COUNT(*) FROM bulk_analysis_domains d 
    WHERE d.project_id = p.id 
    AND d.has_workflow = true
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_bulk_domains_project_status ON bulk_analysis_domains(project_id, qualification_status);