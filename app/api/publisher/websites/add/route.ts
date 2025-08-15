import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherOfferingRelationships } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Input validation schema
const addWebsiteSchema = z.object({
  domain: z.string().min(1).max(255),
  domainRating: z.number().min(0).max(100).nullable().optional(),
  totalTraffic: z.number().min(0).nullable().optional(),
  guestPostCost: z.string().nullable().optional(),
  websiteType: z.string().optional(),
  categories: z.array(z.string()).optional(),
  turnaroundDays: z.number().min(1).default(7),
  acceptsDoFollow: z.boolean().default(true),
  requiresAuthorBio: z.boolean().default(false),
  maxLinksPerPost: z.number().min(1).max(10).default(2),
  contentGuidelines: z.string().optional(),
  notes: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID not found in session' },
        { status: 400 }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = addWebsiteSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Normalize the domain
    let normalizedDomain: string;
    try {
      normalizedDomain = normalizeDomain(data.domain);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    // Check if website already exists with this normalized domain
    const existingWebsite = await db.select({
      id: websites.id,
      domain: websites.domain
    })
    .from(websites)
    .where(eq(websites.domain, normalizedDomain))
    .limit(1);

    if (existingWebsite.length > 0) {
      return NextResponse.json(
        { 
          error: 'Website already exists', 
          website: existingWebsite[0],
          message: 'This website is already in our database. You can claim it instead.'
        },
        { status: 409 }
      );
    }

    // Generate a unique ID for the website
    const websiteId = uuidv4();

    // Create timestamps
    const now = new Date();

    // Insert the new website
    const [newWebsite] = await db.insert(websites)
      .values({
        id: websiteId,
        // airtableId is now nullable, no need to provide it
        domain: normalizedDomain,
        domainRating: data.domainRating,
        totalTraffic: data.totalTraffic,
        guestPostCost: data.guestPostCost,
        websiteType: data.websiteType ? [data.websiteType] : null,
        categories: data.categories,
        status: 'Active',
        hasGuestPost: true,
        
        // Publishing details
        typicalTurnaroundDays: data.turnaroundDays,
        acceptsDoFollow: data.acceptsDoFollow,
        requiresAuthorBio: data.requiresAuthorBio,
        maxLinksPerPost: data.maxLinksPerPost,
        contentGuidelinesUrl: data.contentGuidelines,
        
        // Source tracking
        source: 'publisher',
        addedByPublisherId: session.publisherId,
        sourceMetadata: {
          addedBy: session.email,
          addedAt: now.toISOString(),
          initialData: data
        },
        
        // Timestamps - using current time for all
        airtableCreatedAt: now,
        airtableUpdatedAt: now,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    // Create the publisher relationship
    const [newRelationship] = await db.insert(publisherOfferingRelationships)
      .values({
        publisherId: session.publisherId,
        websiteId: websiteId,
        relationshipType: 'owner', // They added it, so they're the owner
        verificationStatus: 'verified', // Auto-verified since they added it
        verificationMethod: 'publisher_added',
        isActive: true,
        isPrimary: true, // They're the first and primary publisher
        publisherNotes: data.notes || 'Added via publisher portal',
        verifiedAt: now,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json({
      success: true,
      website: newWebsite,
      relationship: newRelationship,
      message: 'Website added successfully'
    });

  } catch (error) {
    console.error('Add website error:', error);
    
    // Check if it's a unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A website with this domain already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to add website' },
      { status: 500 }
    );
  }
}