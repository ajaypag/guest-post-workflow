import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, inArray } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { domainIds, targetProjectId } = await request.json();

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'No domains selected' },
        { status: 400 }
      );
    }

    if (!targetProjectId) {
      return NextResponse.json(
        { error: 'Target project ID is required' },
        { status: 400 }
      );
    }

    // Validate that target project exists and belongs to the client
    const targetProject = await db.query.bulkAnalysisProjects.findFirst({
      where: and(
        eq(bulkAnalysisProjects.id, targetProjectId),
        eq(bulkAnalysisProjects.clientId, clientId)
      )
    });

    if (!targetProject) {
      return NextResponse.json(
        { error: 'Target project not found or does not belong to this client' },
        { status: 404 }
      );
    }

    // Validate that all domains exist and belong to the client
    const existingDomains = await db
      .select({ id: bulkAnalysisDomains.id, domain: bulkAnalysisDomains.domain })
      .from(bulkAnalysisDomains)
      .where(
        and(
          eq(bulkAnalysisDomains.clientId, clientId),
          inArray(bulkAnalysisDomains.id, domainIds)
        )
      );

    if (existingDomains.length !== domainIds.length) {
      const foundIds = existingDomains.map(d => d.id);
      const missingIds = domainIds.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        { 
          error: 'Some domains not found or do not belong to this client',
          missingDomainIds: missingIds
        },
        { status: 404 }
      );
    }

    // Update domains to new project
    const result = await db
      .update(bulkAnalysisDomains)
      .set({
        projectId: targetProjectId || null,
        projectAddedAt: new Date(),
        updatedAt: new Date(),
        // Clear any deletion-related fields when moving
        duplicateOf: null,
        duplicateResolution: null,
        duplicateResolvedBy: null,
        duplicateResolvedAt: null,
        originalProjectId: null,
        resolutionMetadata: null
      })
      .where(
        and(
          eq(bulkAnalysisDomains.clientId, clientId),
          inArray(bulkAnalysisDomains.id, domainIds)
        )
      );

    return NextResponse.json({ 
      success: true,
      movedCount: domainIds.length 
    });
  } catch (error: any) {
    console.error('Error moving domains:', error);
    return NextResponse.json(
      { error: 'Failed to move domains', details: error.message },
      { status: 500 }
    );
  }
}