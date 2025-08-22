import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface UserActionRequest {
  action: 'bookmark' | 'unbookmark' | 'hide' | 'unhide';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId } = params;
    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    const body: UserActionRequest = await request.json();
    const { action } = body;

    if (!['bookmark', 'unbookmark', 'hide', 'unhide'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // First, verify the domain exists and user has access to it
    const domain = await db.query.bulkAnalysisDomains.findFirst({
      where: eq(bulkAnalysisDomains.id, domainId),
      with: {
        client: {
          columns: { id: true, name: true }
        }
      }
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Check permissions - account users can only access their clients' domains
    if (session.userType === 'account') {
      const userClientIds = session.clientId ? [session.clientId] : [];
      if (!userClientIds.includes(domain.clientId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Prepare update data based on action
    let updateData: any = {
      updatedAt: new Date(),
    };

    const userId = session.userId;
    const now = new Date();

    switch (action) {
      case 'bookmark':
        updateData = {
          ...updateData,
          userBookmarked: true,
          userBookmarkedBy: userId,
          userBookmarkedAt: now,
        };
        break;
      
      case 'unbookmark':
        updateData = {
          ...updateData,
          userBookmarked: false,
          userBookmarkedBy: null,
          userBookmarkedAt: null,
        };
        break;
      
      case 'hide':
        updateData = {
          ...updateData,
          userHidden: true,
          userHiddenBy: userId,
          userHiddenAt: now,
        };
        break;
      
      case 'unhide':
        updateData = {
          ...updateData,
          userHidden: false,
          userHiddenBy: null,
          userHiddenAt: null,
        };
        break;
    }

    // Perform the update
    const updatedDomain = await db
      .update(bulkAnalysisDomains)
      .set(updateData)
      .where(eq(bulkAnalysisDomains.id, domainId))
      .returning({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        userBookmarked: bulkAnalysisDomains.userBookmarked,
        userHidden: bulkAnalysisDomains.userHidden,
        userBookmarkedAt: bulkAnalysisDomains.userBookmarkedAt,
        userHiddenAt: bulkAnalysisDomains.userHiddenAt,
        updatedAt: bulkAnalysisDomains.updatedAt,
      });

    if (updatedDomain.length === 0) {
      return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
    }

    const result = updatedDomain[0];

    // Log the action for audit trail
    console.log(`User ${session.name} (${userId}) performed action "${action}" on domain ${result.domain} (${domainId})`);

    return NextResponse.json({
      success: true,
      action,
      domain: result,
      message: getActionMessage(action, result.domain),
    });

  } catch (error) {
    console.error('User Action API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Bulk action endpoint for multiple domains
export async function POST(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle bulk actions if domainId is 'bulk'
    if (params.domainId !== 'bulk') {
      return NextResponse.json({ error: 'Invalid bulk endpoint' }, { status: 400 });
    }

    const body: {
      action: 'bookmark' | 'unbookmark' | 'hide' | 'unhide';
      domainIds: string[];
    } = await request.json();

    const { action, domainIds } = body;

    if (!action || !domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json({ error: 'Action and domain IDs are required' }, { status: 400 });
    }

    if (!['bookmark', 'unbookmark', 'hide', 'unhide'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (domainIds.length > 100) {
      return NextResponse.json({ error: 'Too many domains (max 100)' }, { status: 400 });
    }

    // Verify all domains exist and user has access
    let whereConditions = [eq(bulkAnalysisDomains.id, domainIds[0])];
    for (let i = 1; i < domainIds.length; i++) {
      whereConditions.push(eq(bulkAnalysisDomains.id, domainIds[i]));
    }

    const domains = await db.query.bulkAnalysisDomains.findMany({
      where: and(...whereConditions.map(cond => cond)),
      with: {
        client: {
          columns: { id: true, name: true }
        }
      }
    });

    if (domains.length !== domainIds.length) {
      return NextResponse.json({ error: 'Some domains not found' }, { status: 404 });
    }

    // Check permissions for account users
    if (session.userType === 'account') {
      const userClientIds = session.clientId ? [session.clientId] : [];
      const unauthorizedDomains = domains.filter(domain => !userClientIds.includes(domain.clientId));
      if (unauthorizedDomains.length > 0) {
        return NextResponse.json({ error: 'Access denied to some domains' }, { status: 403 });
      }
    }

    // Prepare bulk update data
    let updateData: any = {
      updatedAt: new Date(),
    };

    const userId = session.userId;
    const now = new Date();

    switch (action) {
      case 'bookmark':
        updateData = {
          ...updateData,
          userBookmarked: true,
          userBookmarkedBy: userId,
          userBookmarkedAt: now,
        };
        break;
      
      case 'unbookmark':
        updateData = {
          ...updateData,
          userBookmarked: false,
          userBookmarkedBy: null,
          userBookmarkedAt: null,
        };
        break;
      
      case 'hide':
        updateData = {
          ...updateData,
          userHidden: true,
          userHiddenBy: userId,
          userHiddenAt: now,
        };
        break;
      
      case 'unhide':
        updateData = {
          ...updateData,
          userHidden: false,
          userHiddenBy: null,
          userHiddenAt: null,
        };
        break;
    }

    // Perform bulk update - we'll need to update each domain individually due to Drizzle limitations
    const updatePromises = domainIds.map(domainId =>
      db.update(bulkAnalysisDomains)
        .set(updateData)
        .where(eq(bulkAnalysisDomains.id, domainId))
        .returning({
          id: bulkAnalysisDomains.id,
          domain: bulkAnalysisDomains.domain,
        })
    );

    const results = await Promise.all(updatePromises);
    const successCount = results.filter(result => result.length > 0).length;

    // Log bulk action
    console.log(`User ${session.name} (${userId}) performed bulk action "${action}" on ${successCount} domains`);

    return NextResponse.json({
      success: true,
      action,
      processedCount: successCount,
      totalRequested: domainIds.length,
      message: `${getActionMessage(action, `${successCount} domains`)}`,
    });

  } catch (error) {
    console.error('Bulk User Action API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getActionMessage(action: string, target: string): string {
  switch (action) {
    case 'bookmark':
      return `Successfully bookmarked ${target}`;
    case 'unbookmark':
      return `Successfully removed bookmark from ${target}`;
    case 'hide':
      return `Successfully hid ${target}`;
    case 'unhide':
      return `Successfully unhid ${target}`;
    default:
      return `Action completed on ${target}`;
  }
}