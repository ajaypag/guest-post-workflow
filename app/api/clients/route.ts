import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let clients;
    if (userId) {
      clients = await ClientService.getUserClients(userId);
    } else {
      clients = await ClientService.getAllClients();
    }

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Add created_by from session
    const clientData = {
      ...data,
      createdBy: session.userId
    };
    
    const client = await ClientService.createClient(clientData);

    // If assignedUsers is provided, handle assignments
    if (data.assignedUsers && Array.isArray(data.assignedUsers)) {
      for (const userId of data.assignedUsers) {
        await ClientService.assignUserToClient(client.id, userId);
      }
    }

    // Handle target pages
    if (data.targetPages && Array.isArray(data.targetPages)) {
      const urls = data.targetPages.filter((u: string) => u.trim());
      if (urls.length > 0) {
        await ClientService.addTargetPages(client.id, urls);
      }
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create client' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;
    
    console.log('🟨 PUT /api/clients - Received data:', { id, updates });
    
    if (!id) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const client = await ClientService.updateClient(id, updates);
    console.log('🟨 ClientService.updateClient result:', client);
    
    if (!client) {
      console.log('🟨 Client not found for ID:', id);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('🟨 Error updating client:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const success = await ClientService.deleteClient(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Client not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete client' },
      { status: 500 }
    );
  }
}