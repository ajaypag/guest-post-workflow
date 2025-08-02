import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check session
    const session = await AuthServiceServer.getSession(request);
    
    // Get all clients directly from database
    const allClients = await db.select().from(clients);
    
    return NextResponse.json({
      session: session ? {
        userId: session.userId,
        email: session.email,
        userType: session.userType,
        role: session.role,
        accountId: session.accountId
      } : null,
      totalClients: allClients.length,
      clients: allClients.map(c => ({
        id: c.id,
        name: c.name,
        website: c.website,
        createdBy: c.createdBy,
        accountId: c.accountId,
        clientType: c.clientType,
        createdAt: c.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug clients error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to debug clients' },
      { status: 500 }
    );
  }
}