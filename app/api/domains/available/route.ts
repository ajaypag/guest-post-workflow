import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { orderItems } from '@/lib/db/orderSchema';
import { eq, and, notInArray, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Get all domains for the client
    const allDomains = await db.query.bulkAnalysisDomains.findMany({
      where: eq(bulkAnalysisDomains.clientId, clientId),
    });

    // Get domains that are already in orders (not completed or cancelled)
    const usedDomains = await db
      .selectDistinct({ domainId: orderItems.domainId })
      .from(orderItems)
      .where(
        and(
          notInArray(orderItems.status, ['completed', 'cancelled']),
          isNull(orderItems.workflowId) // Not yet in workflow
        )
      );

    const usedDomainIds = usedDomains.map(d => d.domainId);

    // Filter out used domains
    const availableDomains = allDomains.filter(
      domain => !usedDomainIds.includes(domain.id)
    );

    return NextResponse.json({ domains: availableDomains });
  } catch (error) {
    console.error('Error fetching available domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available domains' },
      { status: 500 }
    );
  }
}