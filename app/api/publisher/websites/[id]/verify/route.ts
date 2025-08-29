import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { 
  publisherOfferingRelationships,
  publisherEmailClaims 
} from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// POST /api/publisher/websites/[id]/verify - Initiate verification
export async function POST(
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

    const body = await request.json();
    const { method, token } = body;

    if (!method || !token) {
      return NextResponse.json(
        { error: 'Method and token are required' },
        { status: 400 }
      );
    }

    // Check if publisher has a relationship with this website
    const relationships = await db
      .select()
      .from(publisherOfferingRelationships)
      .where(and(
        eq(publisherOfferingRelationships.websiteId, websiteId),
        eq(publisherOfferingRelationships.publisherId, session.publisherId)
      ))
      .limit(1);
    
    const relationship = relationships[0];

    if (!relationship) {
      return NextResponse.json(
        { error: 'You do not have a relationship with this website' },
        { status: 403 }
      );
    }

    // Get website details
    const websiteData = await db
      .select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    
    const website = websiteData[0];

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Handle different verification methods
    switch (method) {
      case 'email':
        // Check if an email claim already exists for this publisher-website pair
        const existingClaims = await db
          .select()
          .from(publisherEmailClaims)
          .where(and(
            eq(publisherEmailClaims.publisherId, session.publisherId),
            eq(publisherEmailClaims.websiteId, websiteId)
          ))
          .limit(1);
        
        const existingClaim = existingClaims[0];
        
        if (existingClaim) {
          // Check rate limiting - prevent spam
          if (existingClaim.verificationSentAt) {
            const lastSent = new Date(existingClaim.verificationSentAt);
            const minutesSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60);
            
            // Enforce 5-minute cooldown between verification emails
            if (minutesSinceLastSent < 5) {
              const waitMinutes = Math.ceil(5 - minutesSinceLastSent);
              return NextResponse.json(
                { 
                  error: `Please wait ${waitMinutes} more minute${waitMinutes > 1 ? 's' : ''} before requesting another verification email.`,
                  retryAfter: waitMinutes * 60 
                },
                { status: 429 }
              );
            }
            
            // Check if too many attempts in last 24 hours
            const hoursSinceLastSent = minutesSinceLastSent / 60;
            if (hoursSinceLastSent < 24) {
              // Count how many times they've requested in last 24 hours
              // For now, we'll allow max 5 attempts per day
              const attemptCount = existingClaim.customData?.dailyAttempts || 1;
              if (attemptCount >= 5) {
                return NextResponse.json(
                  { 
                    error: 'Maximum verification attempts reached for today. Please try again tomorrow.',
                    retryAfter: Math.ceil((24 - hoursSinceLastSent) * 3600)
                  },
                  { status: 429 }
                );
              }
              
              // Update with incremented attempt counter
              await db.update(publisherEmailClaims)
                .set({
                  verificationToken: token,
                  verificationSentAt: new Date(),
                  status: 'pending',
                  verifiedAt: null,
                  rejectionReason: null,
                  customData: {
                    ...((existingClaim.customData as any) || {}),
                    dailyAttempts: attemptCount + 1,
                    lastAttemptAt: new Date().toISOString()
                  },
                  updatedAt: new Date()
                })
                .where(eq(publisherEmailClaims.id, existingClaim.id));
            } else {
              // Reset daily counter after 24 hours
              await db.update(publisherEmailClaims)
                .set({
                  verificationToken: token,
                  verificationSentAt: new Date(),
                  status: 'pending',
                  verifiedAt: null,
                  rejectionReason: null,
                  customData: {
                    ...((existingClaim.customData as any) || {}),
                    dailyAttempts: 1,
                    lastAttemptAt: new Date().toISOString()
                  },
                  updatedAt: new Date()
                })
                .where(eq(publisherEmailClaims.id, existingClaim.id));
            }
          } else {
            // First time sending verification
            await db.update(publisherEmailClaims)
              .set({
                verificationToken: token,
                verificationSentAt: new Date(),
                status: 'pending',
                verifiedAt: null,
                rejectionReason: null,
                customData: {
                  ...((existingClaim.customData as any) || {}),
                  dailyAttempts: 1,
                  lastAttemptAt: new Date().toISOString()
                },
                updatedAt: new Date()
              })
              .where(eq(publisherEmailClaims.id, existingClaim.id));
          }
        } else {
          // Create new email claim record
          const emailClaimId = uuidv4();
          await db.insert(publisherEmailClaims).values({
            id: emailClaimId,
            publisherId: session.publisherId,
            websiteId: websiteId,
            emailDomain: website.domain,
            verificationToken: token,
            verificationSentAt: new Date(),
            status: 'pending',
            claimSource: 'publisher_portal',
            claimConfidence: 'high',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Send actual verification email
        try {
          const { sendWebsiteVerificationEmail } = await import('@/lib/email/templates/websiteVerification');
          
          // Get publisher details for the email
          const { publishers } = await import('@/lib/db/accountSchema');
          const [publisher] = await db
            .select()
            .from(publishers)
            .where(eq(publishers.id, session.publisherId))
            .limit(1);
          
          const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/publisher/websites/verify-click?token=${token}&websiteId=${websiteId}&publisherId=${session.publisherId}`;
          
          // Parse email address from request body - REQUIRED
          const { emailAddress } = body;
          
          if (!emailAddress || !emailAddress.includes('@')) {
            return NextResponse.json(
              { error: 'Please specify an email address to send the verification to' },
              { status: 400 }
            );
          }
          
          // Only send to the specific email address the user provided
          const emailsToSend = [emailAddress];
          
          for (const email of emailsToSend) {
            try {
              await sendWebsiteVerificationEmail(email as string, {
                publisherName: publisher?.contactName || publisher?.companyName || 'Publisher',
                websiteDomain: website.domain,
                verificationToken: token,
                verificationUrl,
                publisherId: session.publisherId,
                websiteId: websiteId
              });
            } catch (emailError) {
              console.error(`Failed to send to ${email}:`, emailError);
              // Continue with other emails even if one fails
            }
          }
          
          console.log(`✅ Verification emails sent for ${website.domain}`);
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
          // Don't fail the whole process if email fails
          console.log(`Fallback: Verification token for ${website.domain}: ${token}`);
        }
        
        // Update relationship status to pending
        await db.update(publisherOfferingRelationships)
          .set({
            verificationStatus: 'pending',
            verificationMethod: 'email',
            updatedAt: new Date()
          })
          .where(eq(publisherOfferingRelationships.id, relationship.id));

        // Check if this was a resend
        const isResend = existingClaim && existingClaim.verificationSentAt;
        
        return NextResponse.json({
          success: true,
          message: isResend 
            ? `New verification email sent to ${emailAddress}. Previous verification link has been invalidated.`
            : `Verification email sent to ${emailAddress}`,
          warning: isResend 
            ? 'A new verification token has been generated. The previous verification link will no longer work.'
            : undefined
        });

      case 'dns':
      case 'meta':
      case 'file':
        // For these methods, just store the token and method
        // The actual verification will happen when they check status
        await db.update(publisherOfferingRelationships)
          .set({
            verificationStatus: 'pending',
            verificationMethod: method,
            customTerms: {
              ...((relationship.customTerms as any) || {}),
              verificationToken: token,
              verificationInitiated: new Date().toISOString()
            },
            updatedAt: new Date()
          })
          .where(eq(publisherOfferingRelationships.id, relationship.id));

        return NextResponse.json({
          success: true,
          message: `${method} verification initiated. Please complete the setup and check status.`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid verification method' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error initiating verification:', error);
    return NextResponse.json(
      { error: 'Failed to initiate verification' },
      { status: 500 }
    );
  }
}