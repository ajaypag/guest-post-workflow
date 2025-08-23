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
    const { domain: rawDomain, offering, offerings } = body;
    
    // Handle both single offering (backward compat) and multiple offerings
    const offeringsToProcess = offerings || (offering ? [offering] : []);
    
    // Basic validation before auth
    if (!rawDomain || offeringsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'Domain and at least one offering are required' },
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
    
    // Validate prices for all offerings
    for (const offeringData of offeringsToProcess) {
      if (offeringData.basePrice) {
        const priceValidation = validatePrice(offeringData.basePrice);
        if (!priceValidation.valid) {
          return NextResponse.json(
            { error: priceValidation.error || 'Invalid price' },
            { status: 400 }
          );
        }
        offeringData.basePrice = priceValidation.sanitized;
      }
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
    
    // Sanitize text fields for all offerings
    for (const offeringData of offeringsToProcess) {
      if (offeringData.contentRequirements) {
        offeringData.contentRequirements = sanitizeText(offeringData.contentRequirements);
      }
      
      if (offeringData.prohibitedTopics) {
        offeringData.prohibitedTopics = sanitizeText(offeringData.prohibitedTopics);
      }
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

      // Multiple offerings per website are now allowed, so no need to check for existing relationships
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
          typicalTurnaroundDays: typicalTurnaroundDays || null,
          // Remove per-offering requirements from website level (now stored per-offering)
          acceptsDoFollow: true, // Default, overridden per-offering
          requiresAuthorBio: false, // Default, overridden per-offering  
          maxLinksPerPost: 2, // Default, overridden per-offering
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
          hasGuestPost: offeringsToProcess.some((o: any) => o.offeringType === 'guest_post'),
          hasLinkInsert: offeringsToProcess.some((o: any) => o.offeringType === 'link_insertion'),
          // Timestamps
          airtableCreatedAt: now,
          airtableUpdatedAt: now,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      websiteId = newWebsite.id;
    }

    // Create multiple publisher offerings with all the details from the form
    const newOfferings = [];
    
    for (const offeringData of offeringsToProcess) {
      const [newOffering] = await db
        .insert(publisherOfferings)
        .values({
          publisherId: session.publisherId,
          offeringType: offeringData.offeringType || 'guest_post',
          basePrice: offeringData.basePrice || 10000, // Already in cents from form
          currency: offeringData.currency || 'USD',
          turnaroundDays: offeringData.turnaroundDays || null,
          minWordCount: offeringData.minWordCount || null,
          maxWordCount: offeringData.maxWordCount || null,
          currentAvailability: offeringData.currentAvailability || 'available',
          expressAvailable: offeringData.expressAvailable || false,
          expressPrice: offeringData.expressPrice || null,
          expressDays: offeringData.expressDays || null,
          // Store all requirements in attributes JSONB field (per-offering)
          attributes: {
            ...offeringData.attributes,
            acceptsDoFollow: offeringData.acceptsDoFollow !== undefined ? offeringData.acceptsDoFollow : true,
            requiresAuthorBio: offeringData.requiresAuthorBio || false,
            maxLinksPerPost: offeringData.maxLinksPerPost || 2,
          },
          isActive: true,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      newOfferings.push(newOffering);

      // Create the relationship between publisher, offering, and website
      await db
        .insert(publisherOfferingRelationships)
        .values({
          publisherId: session.publisherId,
          offeringId: newOffering.id,
          websiteId: websiteId,
          isPrimary: newOfferings.length === 1, // First offering is primary
          isActive: true,
          relationshipType: existingWebsite.length > 0 ? 'reseller' : 'owner',
          verificationStatus: existingWebsite.length > 0 ? 'pending' : 'verified',
          verificationMethod: existingWebsite.length > 0 ? null : 'publisher_added',
          verifiedAt: existingWebsite.length > 0 ? null : now,
          createdAt: now,
          updatedAt: now
        });
    }

    return NextResponse.json({
      success: true,
      websiteId,
      offeringIds: newOfferings.map(o => o.id),
      offeringsCount: newOfferings.length,
      message: existingWebsite.length > 0 
        ? `Successfully created ${newOfferings.length} offering(s) for this existing website` 
        : `Successfully added website and created ${newOfferings.length} offering(s)`
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