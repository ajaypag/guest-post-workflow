import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { 
  publisherOfferingRelationships,
  publisherEmailClaims 
} from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and } from 'drizzle-orm';

// GET /api/publisher/websites/[id]/verification-status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await params;
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.publisherId) {
      return NextResponse.json(
        { error: 'Invalid publisher session' },
        { status: 403 }
      );
    }

    // Get website details
    const [website] = await db
      .select({
        id: websites.id,
        domain: websites.domain
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Get publisher relationship with website
    const [relationship] = await db
      .select()
      .from(publisherOfferingRelationships)
      .where(and(
        eq(publisherOfferingRelationships.websiteId, websiteId),
        eq(publisherOfferingRelationships.publisherId, session.publisherId)
      ))
      .limit(1);

    if (!relationship) {
      return NextResponse.json(
        { error: 'You do not have a relationship with this website' },
        { status: 403 }
      );
    }

    // Get email claim details if using email verification
    let emailClaim = null;
    if (relationship.verificationMethod === 'email') {
      const [claim] = await db
        .select()
        .from(publisherEmailClaims)
        .where(and(
          eq(publisherEmailClaims.publisherId, session.publisherId),
          eq(publisherEmailClaims.websiteId, websiteId)
        ))
        .limit(1);
      
      emailClaim = claim;
    }

    // Determine verification status
    let status: 'pending' | 'verified' | 'failed' | 'expired' = 'pending';
    let expiresAt = null;
    let canResend = false;
    let resendCooldown = null;
    let emailSentTo = null;

    if (relationship.verificationStatus === 'verified') {
      status = 'verified';
    } else if (relationship.verificationStatus === 'failed') {
      status = 'failed';
    } else if (emailClaim) {
      // Check if email verification is expired
      if (emailClaim.verificationSentAt) {
        const sentAt = new Date(emailClaim.verificationSentAt);
        const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
        const expiryDate = new Date(sentAt.getTime() + expiryTime);
        
        if (Date.now() > expiryDate.getTime()) {
          status = 'expired';
        } else {
          status = emailClaim.status === 'verified' ? 'verified' : 'pending';
          expiresAt = expiryDate.toISOString();
        }

        // Check if can resend (5 minute cooldown)
        if (emailClaim.lastAttemptAt) {
          const lastAttempt = new Date(emailClaim.lastAttemptAt);
          const cooldownMs = 5 * 60 * 1000; // 5 minutes
          const nextRetryTime = lastAttempt.getTime() + cooldownMs;
          
          if (Date.now() < nextRetryTime) {
            canResend = false;
            resendCooldown = Math.ceil((nextRetryTime - Date.now()) / 1000); // seconds
          } else {
            canResend = true;
          }
        } else {
          canResend = true;
        }
      } else {
        canResend = true;
      }

      // Get email address from custom terms or use domain default
      if (relationship.customTerms && typeof relationship.customTerms === 'object') {
        const terms = relationship.customTerms as any;
        emailSentTo = terms.emailAddress || `admin@${website.domain}`;
      }
    } else {
      // Non-email verification methods
      if (relationship.verificationStatus === 'pending') {
        status = 'pending';
      }
      canResend = true; // Can always retry non-email methods
    }

    return NextResponse.json({
      website: {
        id: website.id,
        domain: website.domain
      },
      verification: {
        status,
        method: relationship.verificationMethod || 'email',
        requestedAt: relationship.createdAt,
        verifiedAt: relationship.verifiedAt,
        expiresAt,
        lastAttemptAt: emailClaim?.lastAttemptAt,
        attemptCount: emailClaim?.attemptCount,
        maxAttempts: 5,
        nextRetryAt: emailClaim?.dailyResetAt,
        emailSentTo
      },
      canResend,
      resendCooldown
    });

  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 }
    );
  }
}