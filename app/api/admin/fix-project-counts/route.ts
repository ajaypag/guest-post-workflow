import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export async function POST() {
  try {
    // Execute the migration directly without reading from file
    // This avoids issues with SQL parsing
    
    // Drop existing trigger if it exists
    await db.execute(sql`DROP TRIGGER IF EXISTS update_project_stats_trigger ON bulk_analysis_domains`);
    await db.execute(sql`DROP FUNCTION IF EXISTS update_project_stats()`);
    
    // Create updated function that counts all qualified statuses
    await db.execute(sql`
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
      $$ LANGUAGE plpgsql
    `);
    
    // Handle DELETE operations
    await db.execute(sql`
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
      $$ LANGUAGE plpgsql
    `);
    
    // Create triggers
    await db.execute(sql`
      CREATE TRIGGER update_project_stats_trigger
      AFTER INSERT OR UPDATE ON bulk_analysis_domains
      FOR EACH ROW EXECUTE FUNCTION update_project_stats()
    `);
    
    await db.execute(sql`
      CREATE TRIGGER update_project_stats_on_delete_trigger
      AFTER DELETE ON bulk_analysis_domains
      FOR EACH ROW EXECUTE FUNCTION update_project_stats_on_delete()
    `);
    
    // Recalculate all project counts to fix existing data
    await db.execute(sql`
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
        )
    `);
    
    // Add index for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_domains_project_status 
      ON bulk_analysis_domains(project_id, qualification_status)
    `);
    
    // Get updated project stats for verification
    const projectStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_projects,
        SUM(domain_count) as total_domains,
        SUM(qualified_count) as total_qualified,
        SUM(workflow_count) as total_workflows
      FROM bulk_analysis_projects
    `);
    
    // Get a sample of updated projects
    const sampleProjects = await db.execute(sql`
      SELECT id, name, domain_count, qualified_count, workflow_count
      FROM bulk_analysis_projects
      WHERE qualified_count > 0
      ORDER BY last_activity_at DESC
      LIMIT 5
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Project counts updated successfully',
      projectsUpdated: projectStats.rows[0]?.total_projects || 0,
      triggerUpdated: true,
      projectStats: {
        totalProjects: projectStats.rows[0]?.total_projects || 0,
        totalDomains: projectStats.rows[0]?.total_domains || 0,
        totalQualified: projectStats.rows[0]?.total_qualified || 0,
        totalWorkflows: projectStats.rows[0]?.total_workflows || 0,
        sampleProjects: sampleProjects.rows
      }
    });
  } catch (error: any) {
    console.error('Error running project count fix:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update project counts',
        details: error.message 
      },
      { status: 500 }
    );
  }
}