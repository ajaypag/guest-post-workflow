import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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