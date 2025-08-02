import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPages } from '@/lib/db/schema';
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
    
    // Get the target page
    const [targetPage] = await db
      .select()
      .from(targetPages)
      .where(eq(targetPages.id, targetPageId));
      
    if (!targetPage) {
      return NextResponse.json({ error: 'Target page not found' }, { status: 404 });
    }
    
    // For now, internal users can see any target page
    // In the future, we might want to check if account users own the client
    
    return NextResponse.json(targetPage);
    
  } catch (error: any) {
    console.error('Error fetching target page:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch target page' },
      { status: 500 }
    );
  }
}