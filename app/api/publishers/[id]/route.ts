import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: publisherId } = await params;

    // Get publisher details
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.id, publisherId)
    });

    if (!publisher) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: publisher.id,
      contactName: publisher.contactName,
      companyName: publisher.companyName,
      email: publisher.email,
      paymentTerms: publisher.paymentTerms || 'Net 30'
    });

  } catch (error) {
    console.error('Error fetching publisher:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publisher' },
      { status: 500 }
    );
  }
}