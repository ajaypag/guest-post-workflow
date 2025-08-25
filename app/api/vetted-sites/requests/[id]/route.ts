import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests, vettedRequestProjects } from '@/lib/db/vettedSitesRequestSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Update request validation schema
const UpdateVettedSitesRequestSchema = z.object({
  status: z.enum(['submitted', 'reviewing', 'approved', 'in_progress', 'fulfilled', 'rejected']).optional(),
  reviewNotes: z.string().optional(),
  filters: z.object({
    minDa: z.number().optional(),
    maxCost: z.number().optional(),
    topics: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    excludeDomains: z.array(z.string()).optional(),
    includeOnlyDomains: z.array(z.string()).optional(),
  }).optional(),
  notes: z.string().optional(),
});

// GET /api/vetted-sites/requests/[id] - Get specific request with details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const requestId = params.id;

    // Build base query
    let query = db
      .select({
        id: vettedSitesRequests.id,
        accountId: vettedSitesRequests.accountId,
        targetUrls: vettedSitesRequests.targetUrls,
        filters: vettedSitesRequests.filters,
        notes: vettedSitesRequests.notes,
        status: vettedSitesRequests.status,
        reviewedBy: vettedSitesRequests.reviewedBy,
        reviewedAt: vettedSitesRequests.reviewedAt,
        reviewNotes: vettedSitesRequests.reviewNotes,
        approvedBy: vettedSitesRequests.approvedBy,
        approvedAt: vettedSitesRequests.approvedAt,
        fulfilledBy: vettedSitesRequests.fulfilledBy,
        fulfilledAt: vettedSitesRequests.fulfilledAt,
        isSalesRequest: vettedSitesRequests.isSalesRequest,
        createdByUser: vettedSitesRequests.createdByUser,
        prospectName: vettedSitesRequests.prospectName,
        prospectEmail: vettedSitesRequests.prospectEmail,
        prospectCompany: vettedSitesRequests.prospectCompany,
        shareToken: vettedSitesRequests.shareToken,
        shareExpiresAt: vettedSitesRequests.shareExpiresAt,
        claimedByAccount: vettedSitesRequests.claimedByAccount,
        claimedAt: vettedSitesRequests.claimedAt,
        domainCount: vettedSitesRequests.domainCount,
        qualifiedDomainCount: vettedSitesRequests.qualifiedDomainCount,
        createdAt: vettedSitesRequests.createdAt,
        updatedAt: vettedSitesRequests.updatedAt,
      })
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.id, requestId));

    // Apply access control
    if (session.userType === 'account') {
      // For account users, filter by their user ID (the where clause is already set, so we need to use additional AND condition)
      query = db
        .select({
          id: vettedSitesRequests.id,
          accountId: vettedSitesRequests.accountId,
          targetUrls: vettedSitesRequests.targetUrls,
          filters: vettedSitesRequests.filters,
          notes: vettedSitesRequests.notes,
          status: vettedSitesRequests.status,
          reviewedBy: vettedSitesRequests.reviewedBy,
          reviewedAt: vettedSitesRequests.reviewedAt,
          reviewNotes: vettedSitesRequests.reviewNotes,
          approvedBy: vettedSitesRequests.approvedBy,
          approvedAt: vettedSitesRequests.approvedAt,
          fulfilledBy: vettedSitesRequests.fulfilledBy,
          fulfilledAt: vettedSitesRequests.fulfilledAt,
          isSalesRequest: vettedSitesRequests.isSalesRequest,
          createdByUser: vettedSitesRequests.createdByUser,
          prospectName: vettedSitesRequests.prospectName,
          prospectEmail: vettedSitesRequests.prospectEmail,
          prospectCompany: vettedSitesRequests.prospectCompany,
          shareToken: vettedSitesRequests.shareToken,
          shareExpiresAt: vettedSitesRequests.shareExpiresAt,
          claimedByAccount: vettedSitesRequests.claimedByAccount,
          claimedAt: vettedSitesRequests.claimedAt,
          domainCount: vettedSitesRequests.domainCount,
          qualifiedDomainCount: vettedSitesRequests.qualifiedDomainCount,
          createdAt: vettedSitesRequests.createdAt,
          updatedAt: vettedSitesRequests.updatedAt,
        })
        .from(vettedSitesRequests)
        .where(
          and(
            eq(vettedSitesRequests.id, requestId),
            eq(vettedSitesRequests.accountId, session.userId)
          )
        );
    }

    const [requestData] = await query;

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Get linked projects with client information
    const linkedProjectsData = await db
      .select({
        projectId: vettedRequestProjects.projectId,
        addedAt: vettedRequestProjects.addedAt,
        clientId: bulkAnalysisProjects.clientId,
        projectName: bulkAnalysisProjects.name
      })
      .from(vettedRequestProjects)
      .leftJoin(bulkAnalysisProjects, eq(vettedRequestProjects.projectId, bulkAnalysisProjects.id))
      .where(eq(vettedRequestProjects.requestId, requestId));

    const response = {
      ...requestData,
      linkedClients: [], // TODO: Implement if needed
      linkedProjects: linkedProjectsData,
      actualDomainCount: 0, // TODO: Calculate if needed
      actualQualifiedCount: 0, // TODO: Calculate if needed
    };

    return NextResponse.json({ request: response });
  } catch (error) {
    console.error('Error fetching vetted sites request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/vetted-sites/requests/[id] - Update request (internal users only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const requestId = params.id;
    const body = await request.json();
    const validatedData = UpdateVettedSitesRequestSchema.parse(body);

    // Check if request exists
    const existingRequest = await db
      .select({ id: vettedSitesRequests.id, status: vettedSitesRequests.status })
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.id, requestId))
      .limit(1);

    if (existingRequest.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      
      // Set appropriate timestamps based on status
      if (validatedData.status === 'reviewing' && existingRequest[0].status === 'submitted') {
        updateData.reviewedBy = session.userId;
        updateData.reviewedAt = new Date();
      } else if (validatedData.status === 'approved') {
        updateData.approvedBy = session.userId;
        updateData.approvedAt = new Date();
      } else if (validatedData.status === 'fulfilled') {
        updateData.fulfilledBy = session.userId;
        updateData.fulfilledAt = new Date();
      } else if (validatedData.status === 'in_progress') {
        // Status set to in_progress, typically done by confirm endpoint
      }
    }

    if (validatedData.reviewNotes !== undefined) {
      updateData.reviewNotes = validatedData.reviewNotes;
    }

    if (validatedData.filters !== undefined) {
      updateData.filters = validatedData.filters;
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    // Update the request
    const [updatedRequest] = await db
      .update(vettedSitesRequests)
      .set(updateData)
      .where(eq(vettedSitesRequests.id, requestId))
      .returning();

    return NextResponse.json({ 
      request: updatedRequest,
      message: 'Request updated successfully' 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 });
    }

    console.error('Error updating vetted sites request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/vetted-sites/requests/[id] - Delete request (internal users only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const requestId = params.id;

    // Check if request exists
    const existingRequest = await db
      .select({ id: vettedSitesRequests.id })
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.id, requestId))
      .limit(1);

    if (existingRequest.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Delete the request (cascades will handle junction tables)
    await db
      .delete(vettedSitesRequests)
      .where(eq(vettedSitesRequests.id, requestId));

    return NextResponse.json({ 
      message: 'Request deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting vetted sites request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}