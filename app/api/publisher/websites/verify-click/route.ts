import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { 
  publisherOfferingRelationships,
  publisherEmailClaims 
} from '@/lib/db/publisherSchemaActual';
import { eq, and } from 'drizzle-orm';

// GET /api/publisher/websites/verify-click - Handle email verification click
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const websiteId = searchParams.get('websiteId');
    const publisherId = searchParams.get('publisherId');

    if (!token || !websiteId || !publisherId) {
      // Redirect to error page
      return NextResponse.redirect(
        new URL('/publisher/websites/verification-error?reason=invalid_link', request.url)
      );
    }

    // Check if email claim exists and is valid
    const emailClaims = await db
      .select()
      .from(publisherEmailClaims)
      .where(and(
        eq(publisherEmailClaims.publisherId, publisherId),
        eq(publisherEmailClaims.websiteId, websiteId),
        eq(publisherEmailClaims.verificationToken, token),
        eq(publisherEmailClaims.status, 'pending')
      ))
      .limit(1);
    
    const emailClaim = emailClaims[0];

    if (!emailClaim) {
      // Token not found or already used
      return NextResponse.redirect(
        new URL('/publisher/websites/verification-error?reason=invalid_token', request.url)
      );
    }

    // Check if token has expired (24 hours)
    if (!emailClaim.verificationSentAt) {
      return NextResponse.redirect(
        new URL('/publisher/websites/verification-error?reason=invalid_token', request.url)
      );
    }
    
    const sentAt = new Date(emailClaim.verificationSentAt);
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - sentAt.getTime() > expiryTime) {
      return NextResponse.redirect(
        new URL('/publisher/websites/verification-error?reason=expired', request.url)
      );
    }

    // Update email claim to verified
    await db.update(publisherEmailClaims)
      .set({
        verifiedAt: new Date(),
        status: 'verified',
        updatedAt: new Date()
      })
      .where(eq(publisherEmailClaims.id, emailClaim.id));

    // Update all relationships for this publisher-website pair to verified
    await db.update(publisherOfferingRelationships)
      .set({
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verifiedBy: publisherId,
        updatedAt: new Date()
      })
      .where(and(
        eq(publisherOfferingRelationships.publisherId, publisherId),
        eq(publisherOfferingRelationships.websiteId, websiteId)
      ));

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/publisher/websites/${websiteId}?verified=true`, request.url)
    );

  } catch (error) {
    console.error('Error processing verification click:', error);
    return NextResponse.redirect(
      new URL('/publisher/websites/verification-error?reason=error', request.url)
    );
  }
}

// POST endpoint for programmatic verification (optional, for API usage)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, websiteId, publisherId } = body;

    if (!token || !websiteId || !publisherId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check if email claim exists and is valid
    const emailClaims = await db
      .select()
      .from(publisherEmailClaims)
      .where(and(
        eq(publisherEmailClaims.publisherId, publisherId),
        eq(publisherEmailClaims.websiteId, websiteId),
        eq(publisherEmailClaims.verificationToken, token),
        eq(publisherEmailClaims.status, 'pending')
      ))
      .limit(1);
    
    const emailClaim = emailClaims[0];

    if (!emailClaim) {
      return NextResponse.json(
        { error: 'Invalid or already used token' },
        { status: 404 }
      );
    }

    // Check if token has expired (24 hours)
    if (!emailClaim.verificationSentAt) {
      return NextResponse.json(
        { error: 'Invalid token - no sent date found' },
        { status: 400 }
      );
    }
    
    const sentAt = new Date(emailClaim.verificationSentAt);
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - sentAt.getTime() > expiryTime) {
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 410 }
      );
    }

    // Update email claim to verified
    await db.update(publisherEmailClaims)
      .set({
        verifiedAt: new Date(),
        status: 'verified',
        updatedAt: new Date()
      })
      .where(eq(publisherEmailClaims.id, emailClaim.id));

    // Update all relationships for this publisher-website pair to verified
    await db.update(publisherOfferingRelationships)
      .set({
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verifiedBy: publisherId,
        updatedAt: new Date()
      })
      .where(and(
        eq(publisherOfferingRelationships.publisherId, publisherId),
        eq(publisherOfferingRelationships.websiteId, websiteId)
      ));

    return NextResponse.json({
      success: true,
      message: 'Website verified successfully'
    });

  } catch (error) {
    console.error('Error processing verification:', error);
    return NextResponse.json(
      { error: 'Failed to process verification' },
      { status: 500 }
    );
  }
}