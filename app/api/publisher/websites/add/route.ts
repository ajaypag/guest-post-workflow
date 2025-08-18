import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';
import { v4 as uuidv4 } from 'uuid';
import { validateInput, validateDomain, validatePrice, sanitizeText } from '@/lib/utils/inputValidation';
import { apiWriteRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check FIRST (before auth to prevent brute force)
    const clientIp = getClientIp(request);
    const rateLimitKey = `api-write:${clientIp}`;
    const { allowed, retryAfter } = apiWriteRateLimiter.check(rateLimitKey);
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter },
        { 
          status: 429,
          headers: { 'Retry-After': String(retryAfter) }
        }
      );
    }
    
    // Parse and validate input BEFORE authentication
    // This prevents malicious payloads from reaching deeper code
    const body = await request.json();
    const { domain: rawDomain, offering } = body;
    
    // Basic validation before auth
    if (!rawDomain || !offering) {
      return NextResponse.json(
        { error: 'Domain and offering details are required' },
        { status: 400 }
      );
    }
    
    // Validate domain format BEFORE auth (security first)
    const domainValidation = validateDomain(rawDomain);
    if (!domainValidation.valid) {
      return NextResponse.json(
        { error: domainValidation.error || 'Invalid domain' },
        { status: 400 }
      );
    }

    // NOW check authentication (after input validation)
    const session = await AuthServiceServer.getSession(request);
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

    // Get full body data (already parsed and validated above)
    const { 
      // Website fields (only used if website doesn't exist)
      categories,
      niche,
      websiteType,
      monthlyTraffic,
      domainRating,
      domainAuthority,
      websiteLanguage,
      targetAudience,
      publisherTier,
      typicalTurnaroundDays,
      acceptsDoFollow,
      requiresAuthorBio,
      maxLinksPerPost,
      contentGuidelinesUrl,
      editorialCalendarUrl
    } = body;

    // Normalize the domain (after validation)
    let normalizedDomain: string;
    try {
      const normalized = normalizeDomain(domainValidation.sanitized);
      normalizedDomain = normalized.domain;
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }
    
    // Validate price if provided
    if (offering.basePrice) {
      const priceValidation = validatePrice(offering.basePrice);
      if (!priceValidation.valid) {
        return NextResponse.json(
          { error: priceValidation.error || 'Invalid price' },
          { status: 400 }
        );
      }
      offering.basePrice = priceValidation.sanitized;
    }
    
    // Sanitize all text fields
    if (targetAudience) {
      const validation = validateInput(targetAudience, 'text', { maxLength: 1000 });
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.errors.join(', ') },
          { status: 400 }
        );
      }
    }
    
    if (offering.contentRequirements) {
      offering.contentRequirements = sanitizeText(offering.contentRequirements);
    }
    
    if (offering.prohibitedTopics) {
      offering.prohibitedTopics = sanitizeText(offering.prohibitedTopics);
    }

    // Check if website already exists
    const existingWebsite = await db
      .select()
      .from(websites)
      .where(eq(websites.domain, normalizedDomain))
      .limit(1);

    let websiteId: string;
    const now = new Date();

    if (existingWebsite.length > 0) {
      // Website already exists - just use it
      websiteId = existingWebsite[0].id;

      // Check if this publisher already has an offering for this website
      const existingRelationship = await db
        .select()
        .from(publisherOfferingRelationships)
        .where(
          and(
            eq(publisherOfferingRelationships.websiteId, websiteId),
            eq(publisherOfferingRelationships.publisherId, session.publisherId)
          )
        )
        .limit(1);

      if (existingRelationship.length > 0) {
        return NextResponse.json(
          { error: 'You already have an offering for this website' },
          { status: 400 }
        );
      }
    } else {
      // Create new website with all the provided fields
      const newWebsiteId = uuidv4();
      
      const [newWebsite] = await db
        .insert(websites)
        .values({
          id: newWebsiteId,
          domain: normalizedDomain,
          // Categories and arrays
          categories: categories && categories.length > 0 ? categories : null,
          niche: niche && niche.length > 0 ? niche : null,
          websiteType: websiteType && websiteType.length > 0 ? websiteType : null,
          // Metrics
          totalTraffic: monthlyTraffic || null,
          domainRating: domainRating || null,
          // Note: domainAuthority doesn't exist in the current schema, 
          // but we're capturing it for when it's added
          // Publishing info
          websiteLanguage: websiteLanguage || 'en',
          targetAudience: targetAudience || null,
          publisherTier: publisherTier || 'standard',
          typicalTurnaroundDays: typicalTurnaroundDays || 7,
          acceptsDoFollow: acceptsDoFollow !== undefined ? acceptsDoFollow : true,
          requiresAuthorBio: requiresAuthorBio || false,
          maxLinksPerPost: maxLinksPerPost || 2,
          contentGuidelinesUrl: contentGuidelinesUrl || null,
          editorialCalendarUrl: editorialCalendarUrl || null,
          // Metadata
          source: 'publisher',
          addedByPublisherId: session.publisherId,
          sourceMetadata: JSON.stringify({
            addedBy: session.email,
            addedAt: now.toISOString(),
            domainAuthority: domainAuthority // Store here for now
          }),
          status: 'Active',
          hasGuestPost: offering.offeringType === 'guest_post',
          hasLinkInsert: offering.offeringType === 'link_insertion',
          // Timestamps
          airtableCreatedAt: now,
          airtableUpdatedAt: now,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      websiteId = newWebsite.id;
    }

    // Create publisher offering with all the details from the form
    const [newOffering] = await db
      .insert(publisherOfferings)
      .values({
        publisherId: session.publisherId,
        offeringType: offering.offeringType || 'guest_post',
        basePrice: offering.basePrice || 10000, // Already in cents from form
        currency: offering.currency || 'USD',
        turnaroundDays: offering.turnaroundDays || 7,
        minWordCount: offering.minWordCount || 500,
        maxWordCount: offering.maxWordCount || 2000,
        currentAvailability: offering.currentAvailability || 'available',
        expressAvailable: offering.expressAvailable || false,
        expressPrice: offering.expressPrice || null,
        expressDays: offering.expressDays || null,
        // Store additional requirements in attributes JSONB field
        attributes: offering.attributes || {},
        isActive: true,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    // Create the relationship between publisher, offering, and website
    await db
      .insert(publisherOfferingRelationships)
      .values({
        publisherId: session.publisherId,
        offeringId: newOffering.id,
        websiteId: websiteId,
        isPrimary: true,
        isActive: true,
        relationshipType: existingWebsite.length > 0 ? 'reseller' : 'owner',
        verificationStatus: existingWebsite.length > 0 ? 'pending' : 'verified',
        verificationMethod: existingWebsite.length > 0 ? null : 'publisher_added',
        verifiedAt: existingWebsite.length > 0 ? null : now,
        createdAt: now,
        updatedAt: now
      });

    return NextResponse.json({
      success: true,
      websiteId,
      offeringId: newOffering.id,
      message: existingWebsite.length > 0 
        ? 'Successfully created your offering for this existing website' 
        : 'Successfully added website and created your offering'
    });

  } catch (error) {
    console.error('Error adding website:', error);
    
    // Check if it's a unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A website with this domain already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to add website and create offering' },
      { status: 500 }
    );
  }
}