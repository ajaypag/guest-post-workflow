# Bulk Analysis Projects - Implementation Checklist

## Phase 1: Database Foundation (Non-Breaking)

### 1.1 Create Migration Endpoint
- [ ] Create `/app/api/admin/add-bulk-projects-support/route.ts`
- [ ] Create admin UI page `/app/admin/bulk-projects-migration/page.tsx`
- [ ] Add button to admin dashboard

### 1.2 Database Schema Updates
```sql
-- Add to migration:
-- 1. Create projects table
CREATE TABLE IF NOT EXISTS bulk_analysis_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT '📁',
  status VARCHAR(50) DEFAULT 'active',
  auto_apply_keywords JSONB,
  tags JSONB DEFAULT '[]',
  domain_count INTEGER DEFAULT 0,
  qualified_count INTEGER DEFAULT 0,
  workflow_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, name)
);

-- 2. Add project support to domains
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES bulk_analysis_projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS project_added_at TIMESTAMP;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_bulk_projects_client ON bulk_analysis_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_bulk_domains_project ON bulk_analysis_domains(project_id) WHERE project_id IS NOT NULL;

-- 4. Create update trigger for stats
CREATE OR REPLACE FUNCTION update_project_stats() RETURNS TRIGGER AS $$
BEGIN
  -- Update stats when domain changes
  IF NEW.project_id IS NOT NULL THEN
    UPDATE bulk_analysis_projects SET
      domain_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = NEW.project_id),
      qualified_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = NEW.project_id AND qualification_status IN ('high_quality', 'average_quality')),
      workflow_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = NEW.project_id AND has_workflow = true),
      last_activity_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  
  -- Also update old project if domain moved
  IF OLD.project_id IS NOT NULL AND OLD.project_id != NEW.project_id THEN
    UPDATE bulk_analysis_projects SET
      domain_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id),
      qualified_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND qualification_status IN ('high_quality', 'average_quality')),
      workflow_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND has_workflow = true)
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON bulk_analysis_domains
FOR EACH ROW EXECUTE FUNCTION update_project_stats();
```

### 1.3 Update Type Definitions
- [ ] Update `/lib/db/bulkAnalysisSchema.ts` - Add projects table
- [ ] Update `/types/bulk-analysis.ts` - Add project types
- [ ] Create `/types/bulk-analysis-projects.ts` - Project-specific types

## Phase 2: Core API Layer

### 2.1 Project CRUD Endpoints
- [ ] `GET /api/clients/[id]/projects` - List projects
- [ ] `POST /api/clients/[id]/projects` - Create project
- [ ] `PATCH /api/clients/[id]/projects/[projectId]` - Update project
- [ ] `DELETE /api/clients/[id]/projects/[projectId]` - Delete project

### 2.2 Enhanced Domain Endpoints
- [ ] Update `GET /api/clients/[id]/bulk-analysis` - Add projectId filter
- [ ] Update `POST /api/clients/[id]/bulk-analysis` - Accept projectId
- [ ] Create `POST /api/clients/[id]/bulk-analysis/move-to-project` - Bulk move

### 2.3 Service Layer Updates
- [ ] Create `/lib/services/bulkAnalysisProjectService.ts`
- [ ] Update `/lib/db/bulkAnalysisService.ts` - Add project-aware methods
- [ ] Update DataForSEO services - Ensure cache still works across projects

## Phase 3: UI Components (Progressive Enhancement)

### 3.1 Project Management UI
- [ ] Create `/components/ProjectSelector.tsx` - Dropdown/sidebar component
- [ ] Create `/components/ProjectManager.tsx` - Create/edit projects modal
- [ ] Create `/components/ProjectStats.tsx` - Project overview cards

### 3.2 Update Existing Components
- [ ] `BulkAnalysisTable.tsx` - Add project column (hidden by default)
- [ ] `BulkAnalysisTable.tsx` - Add project filter UI
- [ ] Add domain modal - Add project selector
- [ ] Import CSV modal - Add "Add to project" option
- [ ] Bulk actions - Add "Move to project" option

### 3.3 Main Page Updates
- [ ] `/app/clients/[id]/bulk-analysis/page.tsx` - Add project sidebar
- [ ] Add "Organize with projects" CTA for users with many domains
- [ ] Add project view toggle

## Phase 4: Smart Features

### 4.1 Project Templates
- [ ] Common project types (Competitor Analysis, Q1 Campaign, etc.)
- [ ] Copy project structure
- [ ] Default keywords per project type

### 4.2 Cross-Project Features  
- [ ] Duplicate detection across projects
- [ ] Move/copy domains between projects
- [ ] Project comparison view

### 4.3 Analytics
- [ ] Project performance dashboard
- [ ] Timeline view of project progress
- [ ] Export project-specific reports

## Testing Checklist

### Critical Path Testing
- [ ] Adding domains without project works exactly as before
- [ ] DataForSEO cache works across projects
- [ ] Keyword search history works correctly
- [ ] AI qualification sees project context
- [ ] Export includes project info when present
- [ ] Deleting project doesn't delete domains

### Performance Testing
- [ ] Page load time with 1000+ domains
- [ ] Project filtering performance
- [ ] Stat calculation performance
- [ ] API response times

### Edge Cases
- [ ] Domain with no project
- [ ] Domain moved between projects
- [ ] Project with 0 domains
- [ ] Duplicate project names
- [ ] Special characters in project names

## Rollout Plan

### Week 1: Foundation
1. Deploy database changes (no UI)
2. Add API endpoints
3. Test with Postman/internal tools

### Week 2: Soft UI Launch  
1. Add project selector (hidden by default)
2. Enable for internal testing
3. Gather feedback

### Week 3: Progressive Rollout
1. Enable for 10% of users
2. Monitor adoption and issues
3. Iterate based on feedback

### Week 4: Full Launch
1. Enable for all users
2. Add documentation
3. Create tutorial video

## Rollback Plan

If issues arise:
1. Feature flag to hide project UI
2. Keep project_id column (just ignore it)
3. No data loss - domains remain intact
4. Can re-enable when fixed

## Success Criteria

1. **No Breaking Changes** - Existing workflows continue to work
2. **Optional Adoption** - Users can ignore projects completely
3. **Performance** - No degradation in load times
4. **User Satisfaction** - Positive feedback from power users
5. **Data Integrity** - No lost domains or data

## Code Safety Checks

Before each deployment:
1. Run full test suite
2. Test all existing bulk analysis features
3. Verify DataForSEO integration
4. Check database migrations are reversible
5. Ensure feature flags work