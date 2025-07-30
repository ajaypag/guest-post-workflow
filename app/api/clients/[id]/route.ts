import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { advertisers } from '@/lib/db/advertiserSchema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // If advertiser, verify they have access to this client
    if (session.userType === 'advertiser') {
      const advertiser = await db.query.advertisers.findFirst({
        where: eq(advertisers.id, session.userId),
      });
      
      if (!advertiser || advertiser.primaryClientId !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    const client = await ClientService.getClient(id);
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
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
    
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // If advertiser, verify they have access to this client
    if (session.userType === 'advertiser') {
      const advertiser = await db.query.advertisers.findFirst({
        where: eq(advertisers.id, session.userId),
      });
      
      if (!advertiser || advertiser.primaryClientId !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    const updates = await request.json();
    
    console.log('🟨 PUT /api/clients/[id] - ID:', id);
    console.log('🟨 PUT /api/clients/[id] - Updates:', updates);
    
    // First check if client exists
    const existingClient = await ClientService.getClient(id);
    console.log('🟨 Existing client found:', !!existingClient);
    
    if (!existingClient) {
      console.log('🟨 Client not found in database for ID:', id);
      return NextResponse.json(
        { error: 'Client not found in database' },
        { status: 404 }
      );
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
    
    // Check authentication - only internal users can delete clients
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const success = await ClientService.deleteClient(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
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