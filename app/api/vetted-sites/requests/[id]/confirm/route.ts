import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests, vettedRequestProjects } from '@/lib/db/vettedSitesRequestSchema';
import { bulkAnalysisProjects, bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { clients, targetPages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the request
    const vettedRequest = await db
      .select()
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.id, id))
      .limit(1);
    
    const requestRecord = vettedRequest[0];

    if (!requestRecord) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (requestRecord.status !== 'approved') {
      return NextResponse.json({ error: 'Request must be approved before confirming' }, { status: 400 });
    }

    // Get all target pages for the request URLs to find associated clients
    const targetUrls = (requestRecord.targetUrls as string[]) || [];
    const targetPagesData: any[] = [];

    for (const url of targetUrls) {
      const targetPageResults = await db
        .select({
          targetPage: targetPages,
          client: clients
        })
        .from(targetPages)
        .innerJoin(clients, eq(targetPages.clientId, clients.id))
        .where(eq(targetPages.url, url));
      
      if (targetPageResults.length > 0) {
        const result = targetPageResults[0];
        targetPagesData.push({
          ...result.targetPage,
          client: result.client
        });
      }
    }

    // Group by client (brand) - one project per client
    const clientGroups = new Map();
    
    for (const page of targetPagesData) {
      const clientId = page.clientId;
      if (!clientGroups.has(clientId)) {
        clientGroups.set(clientId, {
          client: page.client,
          targetPages: []
        });
      }
      clientGroups.get(clientId).targetPages.push(page);
    }

    const createdProjects = [];

    // Create one bulk analysis project per client
    for (const [clientId, group] of clientGroups) {
      const projectName = `Vetted Sites Analysis - ${group.client.website}`;
      
      // Collect all target page IDs from this client's target pages
      const targetPageIds = group.targetPages.map((page: any) => page.id);
      
      // Check if project already exists for this client and request
      const existingProject = await db
        .select()
        .from(bulkAnalysisProjects)
        .where(and(
          eq(bulkAnalysisProjects.clientId, clientId),
          eq(bulkAnalysisProjects.name, projectName)
        ))
        .limit(1);
      
      let project;
      let projectId;
      
      if (existingProject.length > 0) {
        // Use existing project
        project = existingProject[0];
        projectId = project.id;
      } else {
        // Create new project with default target pages
        projectId = uuidv4();
        const [newProject] = await db.insert(bulkAnalysisProjects).values({
          id: projectId,
          name: projectName,
          clientId: clientId,
          sourceRequestId: id,
          isFromRequest: true,
          defaultTargetPageIds: targetPageIds, // Store target pages to pre-select
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        project = newProject;
      }

      // Note: Domains for analysis will be added manually by users later
      // The bulk analysis project is now ready for the user to add external domains to analyze

      // Link project to request (check if link already exists)
      const existingLink = await db
        .select()
        .from(vettedRequestProjects)
        .where(and(
          eq(vettedRequestProjects.requestId, id),
          eq(vettedRequestProjects.projectId, projectId)
        ))
        .limit(1);
      
      if (existingLink.length === 0) {
        await db.insert(vettedRequestProjects).values({
          requestId: id,
          projectId: projectId,
          addedAt: new Date()
        });
      }

      createdProjects.push({
        projectId,
        projectName,
        clientDomain: group.client.website,
        targetPagesCount: group.targetPages.length,
        note: 'Project created successfully. Users can now add domains to analyze.'
      });
    }

    // Update request status to in_progress
    await db.update(vettedSitesRequests)
      .set({
        status: 'in_progress',
        updatedAt: new Date()
      })
      .where(eq(vettedSitesRequests.id, id));

    return NextResponse.json({
      success: true,
      message: 'Request fulfilled successfully',
      projectsCreated: createdProjects.length,
      projects: createdProjects
    });

  } catch (error) {
    console.error('Error confirming request:', error);
    return NextResponse.json(
      { error: 'Failed to confirm request' },
      { status: 500 }
    );
  }
}