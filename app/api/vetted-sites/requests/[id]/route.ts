import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests, vettedRequestProjects } from '@/lib/db/vettedSitesRequestSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { clients, targetPages, users, accounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getRootDomain } from '@/lib/utils/domainNormalizer';

// Update request validation schema (internal users)
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

// Account user edit validation schema
const AccountEditRequestSchema = z.object({
  target_urls: z.array(z.string().url()).min(1, 'At least one target URL is required'),
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

    // Fetch creator details - check both createdByUser (internal) and accountId (account users)
    let creatorDetails = null;
    
    console.log('Request data:', JSON.stringify({
      id: requestData.id,
      createdByUser: requestData.createdByUser,
      accountId: requestData.accountId
    }, null, 2));
    
    if (requestData.createdByUser) {
      // Internal user created the request
      const [internalUser] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, requestData.createdByUser))
        .limit(1);
      
      creatorDetails = internalUser;
      console.log('Found internal creator:', creatorDetails);
    } else if (requestData.accountId) {
      // Account user created the request
      const [accountUser] = await db
        .select({
          id: accounts.id,
          name: accounts.contactName,
          email: accounts.email
        })
        .from(accounts)
        .where(eq(accounts.id, requestData.accountId))
        .limit(1);
      
      creatorDetails = accountUser;
      console.log('Found account creator:', creatorDetails);
    }

    const response = {
      ...requestData,
      createdByUserName: creatorDetails?.name || null,
      createdByUserEmail: creatorDetails?.email || null,
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
        
        // Auto-create client and target pages to combat spam
        try {
          const currentRequest = await db
            .select({
              accountId: vettedSitesRequests.accountId,
              targetUrls: vettedSitesRequests.targetUrls
            })
            .from(vettedSitesRequests)
            .where(eq(vettedSitesRequests.id, requestId))
            .limit(1);
          
          if (currentRequest.length > 0) {
            const { accountId, targetUrls } = currentRequest[0];
            
            // Group URLs by root domain to create clients
            const urlsByDomain = new Map<string, string[]>();
            for (const url of targetUrls) {
              try {
                const rootDomain = getRootDomain(url);
                if (!urlsByDomain.has(rootDomain)) {
                  urlsByDomain.set(rootDomain, []);
                }
                urlsByDomain.get(rootDomain)!.push(url);
              } catch (e) {
                console.warn('Invalid URL in vetted sites request:', url);
              }
            }
            
            // Create client and target pages for each domain
            for (const [domain, urls] of urlsByDomain) {
              const clientId = uuidv4();
              const now = new Date();
              
              // Create client
              await db.insert(clients).values({
                id: clientId,
                name: domain.charAt(0).toUpperCase() + domain.slice(1),
                website: `https://${domain}`,
                description: `Auto-created from vetted sites request`,
                clientType: 'client',
                createdBy: session.userId,
                accountId: accountId,
                createdAt: now,
                updatedAt: now,
              });
              
              // Create target pages for this root domain
              for (const url of urls) {
                try {
                  const urlDomain = new URL(url).hostname.replace(/^www\./, '');
                  await db.insert(targetPages).values({
                    id: uuidv4(),
                    clientId: clientId,
                    url: url,
                    domain: urlDomain,
                    status: 'active',
                    addedAt: now,
                  });
                } catch (e) {
                  console.warn('Failed to create target page for URL:', url);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error auto-creating client/target pages:', error);
          // Don't fail the approval if client creation fails
        }
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

    // Send email notifications based on status change
    console.log('🔥 Backend: Checking email notification trigger');
    console.log('🔥 Backend: New status:', validatedData.status);
    console.log('🔥 Backend: Old status:', existingRequest[0].status);
    console.log('🔥 Backend: Should send email?', validatedData.status && validatedData.status !== existingRequest[0].status);
    
    if (validatedData.status && validatedData.status !== existingRequest[0].status) {
      console.log('🔥 Backend: Email notification triggered for status change');
      try {
        const { VettedSitesEmailService } = await import('@/lib/services/vettedSitesEmailService');
        console.log('🔥 Backend: Email service imported');
        
        if (validatedData.status === 'approved') {
          console.log('🔥 Backend: Sending approval notification...');
          const result = await VettedSitesEmailService.sendApprovalNotification(requestId);
          console.log(`✅ Approval notification ${result.success ? 'sent' : 'failed'} for request ${requestId}`);
        } else if (validatedData.status === 'fulfilled') {
          console.log('🔥 Backend: Sending fulfillment notification...');
          const result = await VettedSitesEmailService.sendFulfillmentNotification(requestId);
          console.log(`✅ Fulfillment notification ${result.success ? 'sent' : 'failed'} for request ${requestId}`);
        } else if (validatedData.status === 'rejected') {
          console.log('🔥 Backend: Sending rejection notification...');
          const result = await VettedSitesEmailService.sendRejectionNotification(requestId);
          console.log(`✅ Rejection notification ${result.success ? 'sent' : 'failed'} for request ${requestId}`);
        }
      } catch (error) {
        console.error('Error sending status change notification:', error);
        // Don't fail the update if email fails
      }
    } else {
      console.log('🔥 Backend: No email notification needed (same status or no status change)');
    }

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

// PUT /api/vetted-sites/requests/[id] - Update request (account users for their own requests)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const requestId = params.id;
    const body = await request.json();
    const validatedData = AccountEditRequestSchema.parse(body);

    // Check if request exists and user owns it
    const existingRequest = await db
      .select({ 
        id: vettedSitesRequests.id, 
        status: vettedSitesRequests.status,
        accountId: vettedSitesRequests.accountId 
      })
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.id, requestId))
      .limit(1);

    if (existingRequest.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = existingRequest[0];

    // Check ownership
    if (requestData.accountId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if request is still editable (only submitted requests can be edited)
    if (requestData.status !== 'submitted') {
      return NextResponse.json({ 
        error: 'Request cannot be edited after it has been reviewed' 
      }, { status: 400 });
    }

    // Update the request
    const [updatedRequest] = await db
      .update(vettedSitesRequests)
      .set({
        targetUrls: validatedData.target_urls,
        notes: validatedData.notes,
        updatedAt: new Date(),
      })
      .where(eq(vettedSitesRequests.id, requestId))
      .returning();

    return NextResponse.json({ 
      message: 'Request updated successfully',
      request: {
        id: updatedRequest.id,
        targetUrls: updatedRequest.targetUrls,
        notes: updatedRequest.notes,
        updatedAt: updatedRequest.updatedAt
      }
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