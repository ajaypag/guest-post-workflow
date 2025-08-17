import { db } from '@/lib/db/connection';
import { 
  publisherEmailClaims,
  publisherOfferingRelationships,
  type PublisherEmailClaim,
  type NewPublisherEmailClaim,
  VERIFICATION_STATUS
} from '@/lib/db/publisherSchemaActual';
import { publishers } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, or, like, inArray, sql, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { EmailService } from '@/lib/services/emailService';

// Create a sendEmail wrapper for the EmailService
const sendEmail = async (options: { to: string; subject: string; html: string }) => {
  // Use EmailService to send a basic email
  const resend = new (await import('resend')).Resend(process.env.RESEND_API_KEY!);
  return resend.emails.send({
    from: process.env.EMAIL_FROM || 'info@linkio.com',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
};

export class PublisherClaimingService {
  // ============================================================================
  // Claim Initiation
  // ============================================================================

  /**
   * Initiate a claim for websites based on publisher's email
   */
  async initiateClaim(publisherId: string, email: string) {
    // Find potential websites to claim based on email domain
    const emailDomain = email.split('@')[1];
    const claimableWebsites = await this.findClaimableWebsites(email);
    
    const claims: PublisherEmailClaim[] = [];
    
    for (const website of claimableWebsites) {
      // Check if claim already exists
      const existingClaim = await db
        .select()
        .from(publisherEmailClaims)
        .where(
          and(
            eq(publisherEmailClaims.publisherId, publisherId),
            eq(publisherEmailClaims.emailDomain, email),
            eq(publisherEmailClaims.websiteId, website.id)
          )
        )
        .limit(1);
      
      if (existingClaim.length > 0) {
        continue; // Skip if claim already exists
      }
      
      // Create new claim
      const verificationToken = this.generateVerificationToken();
      const [claim] = await db
        .insert(publisherEmailClaims)
        .values({
          publisherId,
          emailDomain: email,
          websiteId: website.id,
          status: 'pending',
          verificationToken
        })
        .returning();
      
      claims.push(claim);
    }
    
    return claims;
  }

  /**
   * Find websites that can be claimed based on email
   */
  async findClaimableWebsites(email: string) {
    const emailDomain = email.split('@')[1];
    
    // Strategy 1: Direct domain match
    const domainMatches = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        confidence: sql<string>`'high'`,
        source: sql<string>`'domain_match'`
      })
      .from(websites)
      .where(
        or(
          eq(websites.domain, emailDomain),
          eq(websites.domain, `www.${emailDomain}`),
          like(websites.domain, `%.${emailDomain}`)
        )
      );
    
    // Strategy 2: Check for email in publisher company field
    const companyMatches = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        confidence: sql<string>`'medium'`,
        source: sql<string>`'company_match'`
      })
      .from(websites)
      .where(
        and(
          sql`${websites.publisherCompany} IS NOT NULL`,
          like(websites.publisherCompany, `%${emailDomain}%`)
        )
      );
    
    // Strategy 3: Check internal notes for email mentions
    const notesMatches = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        confidence: sql<string>`'low'`,
        source: sql<string>`'notes_match'`
      })
      .from(websites)
      .where(
        and(
          sql`${websites.internalNotes} IS NOT NULL`,
          like(websites.internalNotes, `%${email}%`)
        )
      );
    
    // Combine and deduplicate results
    const allMatches = [...domainMatches, ...companyMatches, ...notesMatches];
    const uniqueWebsites = new Map();
    
    for (const match of allMatches) {
      if (!uniqueWebsites.has(match.id)) {
        uniqueWebsites.set(match.id, match);
      }
    }
    
    return Array.from(uniqueWebsites.values());
  }

  // ============================================================================
  // Verification Methods
  // ============================================================================

  /**
   * Send verification email for a claim
   */
  async sendVerificationEmail(claimId: string) {
    const [claim] = await db
      .select({
        claim: publisherEmailClaims,
        publisher: publishers,
        website: websites
      })
      .from(publisherEmailClaims)
      .innerJoin(publishers, eq(publisherEmailClaims.publisherId, publishers.id))
      .innerJoin(websites, eq(publisherEmailClaims.websiteId, websites.id))
      .where(eq(publisherEmailClaims.id, claimId))
      .limit(1);
    
    if (!claim) {
      throw new Error('Claim not found');
    }
    
    const verificationUrl = `${process.env.NEXTAUTH_URL}/publisher/verify-claim?token=${claim.claim.verificationToken}`;
    
    await sendEmail({
      to: claim.claim.emailDomain,
      subject: `Verify Your Website Claim for ${claim.website.domain}`,
      html: `
        <h2>Website Claim Verification</h2>
        <p>Hello ${claim.publisher.contactName},</p>
        <p>You have requested to claim management rights for <strong>${claim.website.domain}</strong>.</p>
        <p>Please click the link below to verify your claim:</p>
        <p><a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background: #0070f3; color: white; text-decoration: none; border-radius: 5px;">Verify Website Claim</a></p>
        <p>This link will expire in 48 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr>
        <p>Best regards,<br>The Linkio Team</p>
      `
    });
    
    // Update claim with sent timestamp
    await db
      .update(publisherEmailClaims)
      .set({
        verificationSentAt: new Date()
      })
      .where(eq(publisherEmailClaims.id, claimId));
    
    return true;
  }

  /**
   * Verify claim by email token
   */
  async verifyClaim(token: string) {
    const [claim] = await db
      .select()
      .from(publisherEmailClaims)
      .where(
        and(
          eq(publisherEmailClaims.verificationToken, token),
          eq(publisherEmailClaims.claimStatus, 'pending')
        )
      )
      .limit(1);
    
    if (!claim) {
      throw new Error('Invalid or expired verification token');
    }
    
    // Check if token is expired (48 hours)
    const sentAt = claim.verificationSentAt;
    if (sentAt) {
      const hoursSinceSent = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSent > 48) {
        throw new Error('Verification token has expired');
      }
    }
    
    // Update claim status
    await db
      .update(publisherEmailClaims)
      .set({
        claimStatus: 'approved',
        verifiedAt: new Date(),
        processedAt: new Date()
      })
      .where(eq(publisherEmailClaims.id, claim.id));
    
    // Create publisher-website relationship
    await this.createRelationshipFromClaim(claim);
    
    return claim;
  }

  /**
   * Verify by DNS TXT record
   */
  async verifyByDNS(websiteId: string, publisherId: string): Promise<boolean> {
    // This would integrate with a DNS lookup service
    // For now, return a placeholder
    // In production, you'd check for a TXT record like:
    // linkio-verify=publisher-{publisherId}
    
    const expectedRecord = `linkio-verify=publisher-${publisherId}`;
    
    // TODO: Implement actual DNS lookup
    // const records = await resolveTxt(domain);
    // return records.some(record => record.includes(expectedRecord));
    
    console.log(`DNS verification for website ${websiteId} and publisher ${publisherId} - Not implemented`);
    return false;
  }

  /**
   * Verify by file upload
   */
  async verifyByFile(websiteId: string, publisherId: string): Promise<boolean> {
    // This would check for a verification file at:
    // https://domain.com/linkio-verify-{publisherId}.txt
    
    const [website] = await db
      .select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    
    if (!website) return false;
    
    const verificationUrl = `https://${website.domain}/linkio-verify-${publisherId}.txt`;
    
    try {
      const response = await fetch(verificationUrl);
      if (response.ok) {
        const content = await response.text();
        return content.includes(publisherId);
      }
    } catch (error) {
      console.error('File verification failed:', error);
    }
    
    return false;
  }

  /**
   * Request manual review for high-value publishers
   */
  async requestManualReview(claimId: string, reason?: string) {
    const [claim] = await db
      .select({
        claim: publisherEmailClaims,
        publisher: publishers,
        website: websites
      })
      .from(publisherEmailClaims)
      .innerJoin(publishers, eq(publisherEmailClaims.publisherId, publishers.id))
      .innerJoin(websites, eq(publisherEmailClaims.websiteId, websites.id))
      .where(eq(publisherEmailClaims.id, claimId))
      .limit(1);
    
    if (!claim) {
      throw new Error('Claim not found');
    }
    
    // Notify admin team for manual review
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@linkio.com',
      subject: `Manual Review Required: Website Claim for ${claim.website.domain}`,
      html: `
        <h2>Manual Website Claim Review Required</h2>
        <p><strong>Publisher:</strong> ${claim.publisher.contactName} (${claim.publisher.email})</p>
        <p><strong>Website:</strong> ${claim.website.domain}</p>
        <p><strong>Claim Confidence:</strong> ${claim.claim.claimConfidence}</p>
        <p><strong>Claim Source:</strong> ${claim.claim.claimSource}</p>
        ${reason ? `<p><strong>Reason for Manual Review:</strong> ${reason}</p>` : ''}
        <p><strong>Website Details:</strong></p>
        <ul>
          <li>Domain Rating: ${claim.website.domainRating || 'N/A'}</li>
          <li>Total Traffic: ${claim.website.totalTraffic || 'N/A'}</li>
          <li>Guest Post Cost: $${claim.website.guestPostCost || 'N/A'}</li>
        </ul>
        <p>Please review this claim in the admin panel.</p>
      `
    });
    
    return true;
  }

  // ============================================================================
  // Claim Management
  // ============================================================================

  /**
   * Approve a claim (admin action)
   */
  async approveClaim(claimId: string, adminId: string) {
    const [claim] = await db
      .select()
      .from(publisherEmailClaims)
      .where(eq(publisherEmailClaims.id, claimId))
      .limit(1);
    
    if (!claim) {
      throw new Error('Claim not found');
    }
    
    // Update claim status
    await db
      .update(publisherEmailClaims)
      .set({
        claimStatus: 'approved',
        verifiedAt: new Date(),
        processedAt: new Date()
      })
      .where(eq(publisherEmailClaims.id, claimId));
    
    // Create publisher-website relationship
    await this.createRelationshipFromClaim(claim);
    
    // TODO: Log admin action for audit trail
    
    return claim;
  }

  /**
   * Reject a claim (admin action)
   */
  async rejectClaim(claimId: string, reason: string) {
    const [claim] = await db
      .update(publisherEmailClaims)
      .set({
        claimStatus: 'rejected',
        processedAt: new Date()
      })
      .where(eq(publisherEmailClaims.id, claimId))
      .returning();
    
    // Notify publisher of rejection
    if (claim && claim.publisherId) {
      const [publisher] = await db
        .select()
        .from(publishers)
        .where(eq(publishers.id, claim.publisherId))
        .limit(1);
      
      if (publisher) {
        await sendEmail({
          to: publisher.email,
          subject: 'Website Claim Status Update',
          html: `
            <h2>Website Claim Rejected</h2>
            <p>Hello ${publisher.contactName},</p>
            <p>Unfortunately, your claim for website management has been rejected.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>If you believe this is an error, please contact our support team.</p>
            <hr>
            <p>Best regards,<br>The Linkio Team</p>
          `
        });
      }
    }
    
    return claim;
  }

  /**
   * Get pending claims for review
   */
  async getPendingClaims() {
    const claims = await db
      .select({
        claim: publisherEmailClaims,
        publisher: publishers,
        website: websites
      })
      .from(publisherEmailClaims)
      .innerJoin(publishers, eq(publisherEmailClaims.publisherId, publishers.id))
      .innerJoin(websites, eq(publisherEmailClaims.websiteId, websites.id))
      .where(eq(publisherEmailClaims.claimStatus, 'pending'))
      .orderBy(desc(publisherEmailClaims.createdAt));
    
    return claims;
  }

  /**
   * Get claims for a publisher
   */
  async getPublisherClaims(publisherId: string) {
    const claims = await db
      .select({
        claim: publisherEmailClaims,
        website: websites
      })
      .from(publisherEmailClaims)
      .innerJoin(websites, eq(publisherEmailClaims.websiteId, websites.id))
      .where(eq(publisherEmailClaims.publisherId, publisherId))
      .orderBy(desc(publisherEmailClaims.createdAt));
    
    return claims;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Generate a secure verification token
   */
  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create publisher-website relationship from approved claim
   */
  private async createRelationshipFromClaim(claim: PublisherEmailClaim) {
    if (!claim.publisherId || !claim.websiteId) {
      throw new Error('Invalid claim data');
    }
    
    // Check if relationship already exists
    const existing = await db
      .select()
      .from(publisherOfferingRelationships)
      .where(
        and(
          eq(publisherOfferingRelationships.publisherId, claim.publisherId),
          eq(publisherOfferingRelationships.websiteId, claim.websiteId)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing relationship
      await db
        .update(publisherOfferingRelationships)
        .set({
          verificationStatus: 'verified',
          verifiedAt: new Date(),
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(publisherOfferingRelationships.id, existing[0].id));
      
      return existing[0];
    }
    
    // Create new relationship
    const [relationship] = await db
      .insert(publisherOfferingRelationships)
      .values({
        publisherId: claim.publisherId,
        websiteId: claim.websiteId,
        relationshipType: 'contact', // Default, can be updated later
        verificationStatus: 'verified',
        verificationMethod: 'email',
        verifiedAt: new Date(),
        contactEmail: claim.emailDomain,
        isActive: true
      })
      .returning();
    
    return relationship;
  }
}

// Export singleton instance
export const publisherClaimingService = new PublisherClaimingService();