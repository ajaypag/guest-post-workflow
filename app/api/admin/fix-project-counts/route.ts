import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export async function POST() {
  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'lib/db/migrations/0010_fix_project_counts_4tier.sql');
    const migrationSql = await fs.readFile(migrationPath, 'utf-8');
    
    // Split SQL statements (basic split on semicolons that end statements)
    const statements = migrationSql
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await db.execute(sql.raw(statement));
      }
    }
    
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