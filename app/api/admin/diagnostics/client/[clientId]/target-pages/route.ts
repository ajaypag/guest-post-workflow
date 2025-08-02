import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients, targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    
    // Get client info
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));
      
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    // Get target pages for this client
    const clientTargetPages = await db
      .select()
      .from(targetPages)
      .where(eq(targetPages.clientId, clientId));
    
    return NextResponse.json({
      client,
      targetPages: clientTargetPages,
      diagnostics: {
        totalPages: clientTargetPages.length,
        activePages: clientTargetPages.filter(p => p.status === 'active').length,
        usageInfo: clientTargetPages.map(p => ({
          id: p.id,
          url: p.url,
          title: p.title,
          usage_count: p.usage_count,
          status: p.status
        }))
      }
    });
    
  } catch (error) {
    console.error('Error in client target pages diagnostics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch client target pages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}