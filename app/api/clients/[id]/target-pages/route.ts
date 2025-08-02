import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';
import { AuthServiceServer } from '@/lib/auth-server';

// GET /api/clients/[id]/target-pages - Get all target pages for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`GET /api/clients/${id}/target-pages - Fetching target pages`);
    
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if client exists and get it for permission check
    const client = await ClientService.getClient(id);
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Check access permissions
    if (session.userType === 'internal') {
      // Internal users: Full access to any client's target pages
    } else if (session.userType === 'account') {
      // Account users: Only access their own client's target pages
      if (client.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }

    // Get target pages for this client
    const targetPages = await ClientService.getTargetPages(id);
    
    console.log(`Found ${targetPages.length} target pages for client ${id}`);
    
    return NextResponse.json({ 
      targetPages,
      clientId: id 
    });

  } catch (error) {
    console.error('Error fetching target pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch target pages' },
      { status: 500 }
    );
  }
}

// POST /api/clients/[id]/target-pages - Add new target pages to a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { urls } = await request.json();
    
    console.log(`POST /api/clients/${id}/target-pages - Adding target pages`, { urls });
    
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate input
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate URLs
    const validUrls = [];
    const invalidUrls = [];
    
    for (const url of urls) {
      try {
        new URL(url); // This will throw if URL is invalid
        validUrls.push(url.trim());
      } catch {
        invalidUrls.push(url);
      }
    }

    if (invalidUrls.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some URLs are invalid',
          invalidUrls,
          validUrls
        },
        { status: 400 }
      );
    }

    // Check if client exists and get it for permission check
    const client = await ClientService.getClient(id);
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    if (session.userType === 'internal') {
      // Internal users: Can add target pages to any client
    } else if (session.userType === 'account') {
      // Account users: Can only add to their own clients
      if (client.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }

    // Add target pages using ClientService
    const result = await ClientService.addTargetPages(id, validUrls);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to add target pages to database' },
        { status: 500 }
      );
    }

    // Get the updated target pages list
    const updatedTargetPages = await ClientService.getTargetPages(id);
    
    console.log(`Successfully added ${result.added} target pages to client ${id} (${result.duplicates} duplicates skipped)`);
    
    const message = result.duplicates > 0 
      ? `Added ${result.added} new target pages (${result.duplicates} duplicates skipped)`
      : `Added ${result.added} target pages`;
    
    return NextResponse.json({
      success: true,
      message,
      targetPages: updatedTargetPages,
      addedUrls: validUrls.slice(0, result.added), // Only the ones actually added
      duplicatesSkipped: result.duplicates
    });

  } catch (error) {
    console.error('Error adding target pages:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add target pages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id]/target-pages - Bulk update target page statuses
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { pageIds, status } = await request.json();
    
    console.log(`PUT /api/clients/${id}/target-pages - Updating status`, { pageIds, status });
    
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate input
    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json(
        { error: 'pageIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!status || !['active', 'inactive', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (active, inactive, or completed)' },
        { status: 400 }
      );
    }

    // Check if client exists and get it for permission check
    const client = await ClientService.getClient(id);
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    if (session.userType === 'internal') {
      // Internal users: Can update target pages for any client
    } else if (session.userType === 'account') {
      // Account users: Can only update their own client's target pages
      if (client.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }

    // Update target page statuses using ClientService
    const success = await ClientService.updateTargetPageStatus(id, pageIds, status);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update target page statuses' },
        { status: 500 }
      );
    }

    // Get the updated target pages list
    const updatedTargetPages = await ClientService.getTargetPages(id);
    
    console.log(`Successfully updated ${pageIds.length} target pages to status: ${status}`);
    
    return NextResponse.json({
      success: true,
      message: `Updated ${pageIds.length} target pages to ${status}`,
      targetPages: updatedTargetPages,
      updatedPageIds: pageIds
    });

  } catch (error) {
    console.error('Error updating target pages:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update target pages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id]/target-pages - Remove target pages from a client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { pageIds } = await request.json();
    
    console.log(`DELETE /api/clients/${id}/target-pages - Removing target pages`, { pageIds });
    
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate input
    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json(
        { error: 'pageIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Check if client exists and get it for permission check
    const client = await ClientService.getClient(id);
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    if (session.userType === 'internal') {
      // Internal users: Can remove target pages from any client
    } else if (session.userType === 'account') {
      // Account users: Can only remove from their own clients
      if (client.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }

    // Remove target pages using ClientService
    const success = await ClientService.removeTargetPages(id, pageIds);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove target pages from database' },
        { status: 500 }
      );
    }

    // Get the updated target pages list
    const updatedTargetPages = await ClientService.getTargetPages(id);
    
    console.log(`Successfully removed ${pageIds.length} target pages from client ${id}`);
    
    return NextResponse.json({
      success: true,
      message: `Removed ${pageIds.length} target pages`,
      targetPages: updatedTargetPages,
      removedPageIds: pageIds
    });

  } catch (error) {
    console.error('Error removing target pages:', error);
    return NextResponse.json(
      { 
        error: 'Failed to remove target pages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}