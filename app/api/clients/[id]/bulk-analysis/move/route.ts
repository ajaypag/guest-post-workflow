import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
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

    // Update domains to new project
    const result = await db
      .update(bulkAnalysisDomains)
      .set({
        projectId: targetProjectId,
        projectAddedAt: new Date(),
        updatedAt: new Date()
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