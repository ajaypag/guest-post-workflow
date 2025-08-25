import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests } from '@/lib/db/vettedSitesRequestSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { clients } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { requestId, shareToken } = body;
    
    // Create a test request (without domains for now)
    const [newRequest] = await db.insert(vettedSitesRequests).values({
      id: requestId || uuidv4(),
      targetUrls: ['https://example.com/test'],
      filters: {},
      status: 'fulfilled',
      isSalesRequest: true,
      prospectCompany: 'Test Company',
      shareToken: shareToken || uuidv4(),
      shareExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      domainCount: 0,
      qualifiedDomainCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      shareToken: newRequest.shareToken
    });
    
  } catch (error) {
    console.error('Error creating test request:', error);
    return NextResponse.json({ error: 'Failed to create test request' }, { status: 500 });
  }
}