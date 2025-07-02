import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';

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
    const data = await request.json();
    const client = await ClientService.createClient(data);

    // If assignedUsers is provided, handle assignments
    if (data.assignedUsers && Array.isArray(data.assignedUsers)) {
      for (const userId of data.assignedUsers) {
        await ClientService.assignUserToClient(client.id, userId);
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