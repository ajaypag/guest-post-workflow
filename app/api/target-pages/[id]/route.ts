import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPages, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: targetPageId } = await params;
    
    // Get the target page with client info for permission check
    const result = await db
      .select({
        targetPage: targetPages,
        client: clients
      })
      .from(targetPages)
      .innerJoin(clients, eq(targetPages.clientId, clients.id))
      .where(eq(targetPages.id, targetPageId));
      
    if (result.length === 0) {
      return NextResponse.json({ error: 'Target page not found' }, { status: 404 });
    }
    
    const { targetPage, client } = result[0];
    
    // Check permissions based on user type
    if (session.userType === 'internal') {
      // Internal users: Can access any target page
    } else if (session.userType === 'account') {
      // Account users: Can only access target pages from their own clients
      if (client.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }
    
    return NextResponse.json(targetPage);
    
  } catch (error: any) {
    console.error('Error fetching target page:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch target page' },
      { status: 500 }
    );
  }
}