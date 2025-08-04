import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First get the client
    const client = await ClientService.getClient(id);
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Check access - both internal and account users allowed with different permissions
    if (session.userType === 'internal') {
      // Internal users: Full access to any client
    } else if (session.userType === 'account') {
      // Account users: Only access clients they own
      if (client.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }
    
    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    
    console.log('🟨 PUT /api/clients/[id] - ID:', id);
    console.log('🟨 PUT /api/clients/[id] - Updates:', updates);
    
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First check if client exists and get current data
    const existingClient = await ClientService.getClient(id);
    console.log('🟨 Existing client found:', !!existingClient);
    
    if (!existingClient) {
      console.log('🟨 Client not found in database for ID:', id);
      return NextResponse.json(
        { error: 'Client not found in database' },
        { status: 404 }
      );
    }
    
    // Check access - both internal and account users allowed with different permissions
    if (session.userType === 'internal') {
      // Internal users: Can update any client
    } else if (session.userType === 'account') {
      // Account users: Only update clients they own
      if (existingClient.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
      }
      
      // Account users cannot change ownership
      if (updates.accountId && updates.accountId !== session.userId) {
        return NextResponse.json({ 
          error: 'Forbidden - Cannot transfer brand ownership' 
        }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }
    
    const client = await ClientService.updateClient(id, updates);
    console.log('🟨 Update result:', !!client);
    
    if (!client) {
      console.log('🟨 ClientService.updateClient returned null');
      return NextResponse.json(
        { error: 'Update operation failed' },
        { status: 404 }
      );
    }
    
    console.log('🟨 Update successful, returning client');
    return NextResponse.json({ client });
  } catch (error) {
    console.error('🟨 Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First check if client exists
    const existingClient = await ClientService.getClient(id);
    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Check access - both internal and account users allowed with different permissions
    if (session.userType === 'internal') {
      // Internal users: Can delete any client
    } else if (session.userType === 'account') {
      // Account users: Only delete clients they own
      if (existingClient.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }
    
    const success = await ClientService.deleteClient(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}