import { NextRequest, NextResponse } from 'next/server';
import { getJwtPayload } from '@/lib/utils/jwtUtils';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests } from '@/lib/db/vettedSitesRequestSchema';
import { eq, sql, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import crypto from 'crypto';

// Sales request validation schema
const CreateSalesRequestSchema = z.object({
  targetUrls: z.array(z.string().url()).min(1, 'At least one target URL is required'),
  prospectName: z.string().min(1, 'Prospect name is required'),
  prospectEmail: z.string().email('Valid email is required'),
  prospectCompany: z.string().optional(),
  filters: z.object({
    minDa: z.number().optional(),
    maxCost: z.number().optional(),
    topics: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    excludeDomains: z.array(z.string()).optional(),
    includeOnlyDomains: z.array(z.string()).optional(),
  }).optional(),
  notes: z.string().optional(),
  // Attribution tracking
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  referringUrl: z.string().optional(),
});

// POST /api/vetted-sites/requests/sales - Create sales request (internal users only)
export async function POST(request: NextRequest) {
  try {
    const jwtPayload = await getJwtPayload(request);
    if (!jwtPayload || jwtPayload.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Internal access only' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateSalesRequestSchema.parse(body);

    // Generate share token and expiry (30 days from now)
    const shareToken = crypto.randomBytes(32).toString('hex');
    const shareExpiresAt = new Date();
    shareExpiresAt.setDate(shareExpiresAt.getDate() + 30);

    // Generate claim token for account transfer (6 months validity)
    const claimToken = crypto.randomBytes(16).toString('hex');
    const claimExpiresAt = new Date();
    claimExpiresAt.setMonth(claimExpiresAt.getMonth() + 6);

    // Create the sales request
    const requestId = uuidv4();
    const newRequest = {
      id: requestId,
      accountId: null, // No account initially for sales requests
      targetUrls: validatedData.targetUrls,
      filters: validatedData.filters || {},
      notes: validatedData.notes,
      status: 'submitted' as const,
      
      // Sales request specific fields
      isSalesRequest: true,
      createdByUser: jwtPayload.userId,
      prospectName: validatedData.prospectName,
      prospectEmail: validatedData.prospectEmail,
      prospectCompany: validatedData.prospectCompany,
      
      // Sharing and claiming
      shareToken: shareToken,
      shareExpiresAt: shareExpiresAt,
      claimToken: claimToken,
      claimExpiresAt: claimExpiresAt,
      
      // Attribution tracking
      utmSource: validatedData.utmSource,
      utmMedium: validatedData.utmMedium,
      utmCampaign: validatedData.utmCampaign,
      referringUrl: validatedData.referringUrl,
    };

    const [createdRequest] = await db
      .insert(vettedSitesRequests)
      .values(newRequest)
      .returning();

    // Construct shareable URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/vetted-sites/shared/${shareToken}`;
    const claimUrl = `${baseUrl}/account/claim-analysis/${claimToken}`;

    return NextResponse.json({ 
      request: {
        ...createdRequest,
        shareUrl,
        claimUrl,
      },
      message: 'Sales request created successfully',
      urls: {
        share: shareUrl,
        claim: claimUrl,
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 });
    }

    console.error('Error creating sales request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/vetted-sites/requests/sales - List sales requests (internal users only)
export async function GET(request: NextRequest) {
  try {
    const jwtPayload = await getJwtPayload(request);
    if (!jwtPayload || jwtPayload.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Internal access only' }, { status: 401 });
    }

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const claimed = searchParams.get('claimed');

    // Apply additional filters if provided
    const conditions = [eq(vettedSitesRequests.isSalesRequest, true)];
    
    if (status) {
      conditions.push(eq(vettedSitesRequests.status, status));
    }

    if (claimed === 'true') {
      conditions.push(sql`${vettedSitesRequests.claimedByAccount} IS NOT NULL`);
    } else if (claimed === 'false') {
      conditions.push(sql`${vettedSitesRequests.claimedByAccount} IS NULL`);
    }

    // Rebuild query with all conditions
    const finalQuery = db
      .select({
        id: vettedSitesRequests.id,
        prospectName: vettedSitesRequests.prospectName,
        prospectEmail: vettedSitesRequests.prospectEmail,
        prospectCompany: vettedSitesRequests.prospectCompany,
        targetUrls: vettedSitesRequests.targetUrls,
        status: vettedSitesRequests.status,
        shareToken: vettedSitesRequests.shareToken,
        shareExpiresAt: vettedSitesRequests.shareExpiresAt,
        claimToken: vettedSitesRequests.claimToken,
        claimedByAccount: vettedSitesRequests.claimedByAccount,
        claimedAt: vettedSitesRequests.claimedAt,
        domainCount: vettedSitesRequests.domainCount,
        qualifiedDomainCount: vettedSitesRequests.qualifiedDomainCount,
        createdByUser: vettedSitesRequests.createdByUser,
        createdAt: vettedSitesRequests.createdAt,
        updatedAt: vettedSitesRequests.updatedAt,
        fulfilledAt: vettedSitesRequests.fulfilledAt,
        utmSource: vettedSitesRequests.utmSource,
        utmMedium: vettedSitesRequests.utmMedium,
        utmCampaign: vettedSitesRequests.utmCampaign,
      })
      .from(vettedSitesRequests)
      .where(and(...conditions));

    const salesRequests = await finalQuery;

    // Add shareable URLs to each request
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const requestsWithUrls = salesRequests.map(req => ({
      ...req,
      shareUrl: req.shareToken ? `${baseUrl}/vetted-sites/shared/${req.shareToken}` : null,
      claimUrl: req.claimToken ? `${baseUrl}/account/claim-analysis/${req.claimToken}` : null,
    }));

    return NextResponse.json({ requests: requestsWithUrls });

  } catch (error) {
    console.error('Error fetching sales requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}