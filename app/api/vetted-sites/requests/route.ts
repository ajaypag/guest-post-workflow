import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests, vettedRequestClients } from '@/lib/db/vettedSitesRequestSchema';
import { accounts } from '@/lib/db/accountSchema';
import { clients } from '@/lib/db/schema';
import { eq, and, desc, inArray, ilike, or, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Request validation schema matching existing database schema
const CreateVettedSitesRequestSchema = z.object({
  target_urls: z.array(z.string().url()).min(1, 'At least one target URL is required'),
  client_assignments: z.record(z.string(), z.string()).optional(), // URL -> clientId mapping
  filters: z.object({
    price_min: z.number().optional(),
    price_max: z.number().optional(),
    dr_min: z.number().optional(),
    dr_max: z.number().optional(),
    traffic_min: z.number().optional(),
    niches: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    site_types: z.array(z.string()).optional(),
  }).optional(),
  notes: z.string().optional(),
});

// GET /api/vetted-sites/requests - List requests for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const offset = (page - 1) * limit;

    let requests;

    if (session.userType === 'internal') {
      // Internal users can see all requests
      // Apply filters
      const conditions = [];
      if (status) {
        const statusValues = status.split(',');
        conditions.push(inArray(vettedSitesRequests.status, statusValues));
      }
      if (search) {
        conditions.push(or(
          ilike(vettedSitesRequests.notes, `%${search}%`),
          sql`${vettedSitesRequests.targetUrls}::text ILIKE ${'%' + search + '%'}`,
          ilike(accounts.contactName, `%${search}%`),
          ilike(accounts.email, `%${search}%`)
        ));
      }
      
      // Build complete query in one go
      if (conditions.length > 0) {
        requests = await db
          .select({
            id: vettedSitesRequests.id,
            account_id: vettedSitesRequests.accountId,
            target_urls: vettedSitesRequests.targetUrls,
            filters: vettedSitesRequests.filters,
            notes: vettedSitesRequests.notes,
            status: vettedSitesRequests.status,
            created_at: vettedSitesRequests.createdAt,
            updated_at: vettedSitesRequests.updatedAt,
            account_name: accounts.contactName,
            account_email: accounts.email,
          })
          .from(vettedSitesRequests)
          .leftJoin(accounts, eq(vettedSitesRequests.accountId, accounts.id))
          .where(and(...conditions))
          .orderBy(desc(vettedSitesRequests.createdAt))
          .limit(limit)
          .offset(offset);
      } else {
        requests = await db
          .select({
            id: vettedSitesRequests.id,
            account_id: vettedSitesRequests.accountId,
            target_urls: vettedSitesRequests.targetUrls,
            filters: vettedSitesRequests.filters,
            notes: vettedSitesRequests.notes,
            status: vettedSitesRequests.status,
            created_at: vettedSitesRequests.createdAt,
            updated_at: vettedSitesRequests.updatedAt,
            account_name: accounts.contactName,
            account_email: accounts.email,
          })
          .from(vettedSitesRequests)
          .leftJoin(accounts, eq(vettedSitesRequests.accountId, accounts.id))
          .orderBy(desc(vettedSitesRequests.createdAt))
          .limit(limit)
          .offset(offset);
      }
    } else if (session.userType === 'account') {
      // Account users can only see their own requests
      // Apply filters
      const conditions = [eq(vettedSitesRequests.accountId, session.userId)];
      if (status) {
        const statusValues = status.split(',');
        conditions.push(inArray(vettedSitesRequests.status, statusValues));
      }
      if (search) {
        const searchCondition = or(
          ilike(vettedSitesRequests.notes, `%${search}%`),
          sql`${vettedSitesRequests.targetUrls}::text ILIKE ${'%' + search + '%'}`
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }
      
      requests = await db
        .select({
          id: vettedSitesRequests.id,
          account_id: vettedSitesRequests.accountId,
          target_urls: vettedSitesRequests.targetUrls,
          filters: vettedSitesRequests.filters,
          notes: vettedSitesRequests.notes,
          status: vettedSitesRequests.status,
          created_at: vettedSitesRequests.createdAt,
          updated_at: vettedSitesRequests.updatedAt,
        })
        .from(vettedSitesRequests)
        .where(and(...conditions))
        .orderBy(desc(vettedSitesRequests.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching vetted sites requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/vetted-sites/requests - Create new request
export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateVettedSitesRequestSchema.parse(body);

    // Verify account exists if account user
    if (session.userType === 'account') {
      const accountExists = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.id, session.userId))
        .limit(1);

      if (accountExists.length === 0) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
    }

    // Transform new filter format to existing schema format
    const transformedFilters = validatedData.filters ? {
      maxCost: validatedData.filters.price_max ? validatedData.filters.price_max / 100 : undefined, // Convert cents to dollars
      minDa: validatedData.filters.dr_min,
      topics: validatedData.filters.niches || [],
      keywords: [],
    } : {};

    // Create the request
    const requestId = uuidv4();
    const newRequest = {
      id: requestId,
      accountId: session.userType === 'account' ? session.userId : null,
      targetUrls: validatedData.target_urls, // This should be a JS array for jsonb
      filters: transformedFilters,
      notes: validatedData.notes,
      status: 'submitted' as const,
      createdByUser: session.userType === 'internal' ? session.userId : null,
    };


    const [createdRequest] = await db
      .insert(vettedSitesRequests)
      .values(newRequest)
      .returning();

    // Store client assignments if provided (store as notes for now)
    if (validatedData.client_assignments && Object.keys(validatedData.client_assignments).length > 0) {
      const assignmentText = Object.entries(validatedData.client_assignments)
        .map(([url, clientId]) => `${url} -> Client: ${clientId}`)
        .join('\n');
      newRequest.notes = newRequest.notes 
        ? `${newRequest.notes}\n\nClient assignments:\n${assignmentText}`
        : `Client assignments:\n${assignmentText}`;
    }

    return NextResponse.json({ 
      id: createdRequest.id,
      message: 'Vetted sites request created successfully' 
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 });
    }

    console.error('Error creating vetted sites request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}