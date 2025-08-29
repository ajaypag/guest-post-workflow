import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find orphaned target pages
    const orphanedTargetPages = await db.execute(sql`
      SELECT 
        tp.id,
        tp.url,
        tp.client_id,
        c.name as client_name
      FROM target_pages tp
      LEFT JOIN clients c ON tp.client_id = c.id
      LEFT JOIN order_line_items oli ON tp.id = oli.target_page_id
      LEFT JOIN target_page_intelligence tpi ON tp.id = tpi.target_page_id
      LEFT JOIN intelligence_generation_logs igl ON tp.id = igl.target_page_id
      LEFT JOIN workflows w ON tp.id = w.target_page_id
      WHERE 
        oli.id IS NULL 
        AND tpi.id IS NULL 
        AND igl.id IS NULL 
        AND w.id IS NULL
        AND (tp.keywords IS NULL OR tp.keywords = '')
        AND (tp.description IS NULL OR tp.description = '')
      ORDER BY c.name, tp.url
    `);

    // Find orphaned bulk analysis projects
    const orphanedProjects = await db.execute(sql`
      SELECT 
        bap.id,
        bap.name,
        bap.client_id,
        c.name as client_name
      FROM bulk_analysis_projects bap
      LEFT JOIN clients c ON bap.client_id = c.id
      LEFT JOIN bulk_analysis_domains bad ON bap.id = bad.project_id
      LEFT JOIN project_order_associations poa ON bap.id = poa.project_id
      LEFT JOIN project_websites pw ON bap.id = pw.project_id
      LEFT JOIN vetted_request_projects vrp ON bap.id = vrp.project_id
      LEFT JOIN website_qualifications wq ON bap.id = wq.project_id
      LEFT JOIN order_groups og ON bap.id = og.bulk_analysis_project_id
      GROUP BY bap.id, bap.name, bap.client_id, c.name
      HAVING 
        COUNT(DISTINCT bad.id) = 0
        AND COUNT(DISTINCT poa.order_id) = 0
        AND COUNT(DISTINCT pw.website_id) = 0
        AND COUNT(DISTINCT vrp.request_id) = 0
        AND COUNT(DISTINCT wq.id) = 0
        AND COUNT(DISTINCT og.id) = 0
      ORDER BY c.name, bap.name
    `);

    // Find orphaned clients (no target pages, no projects, no orders)
    const orphanedClients = await db.execute(sql`
      SELECT 
        c.id,
        c.name,
        c.website as normalized_domain,
        c.created_at,
        a.name as account_name
      FROM clients c
      LEFT JOIN accounts a ON c.account_id = a.id
      LEFT JOIN target_pages tp ON c.id = tp.client_id
      LEFT JOIN bulk_analysis_projects bap ON c.id = bap.client_id
      LEFT JOIN order_groups og ON c.id = og.client_id
      LEFT JOIN vetted_request_clients vrc ON c.id = vrc.client_id
      GROUP BY c.id, c.name, c.website, c.created_at, a.name
      HAVING 
        COUNT(DISTINCT tp.id) = 0
        AND COUNT(DISTINCT bap.id) = 0
        AND COUNT(DISTINCT og.id) = 0
        AND COUNT(DISTINCT vrc.request_id) = 0
      ORDER BY c.created_at DESC
    `);

    return NextResponse.json({
      targetPages: {
        count: orphanedTargetPages.rows.length,
        items: orphanedTargetPages.rows
      },
      projects: {
        count: orphanedProjects.rows.length,
        items: orphanedProjects.rows
      },
      clients: {
        count: orphanedClients.rows.length,
        items: orphanedClients.rows
      }
    });

  } catch (error) {
    console.error('Error analyzing orphaned data:', error);
    return NextResponse.json(
      { error: 'Failed to analyze orphaned data' },
      { status: 500 }
    );
  }
}