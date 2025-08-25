import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferings, publisherOfferingRelationships, publisherPricingRules } from '@/lib/db/publisherSchemaActual';
import { 
  emailReviewQueue, 
  publisherAutomationLogs,
  shadowPublisherWebsites,
  emailProcessingLogs 
} from '@/lib/db/emailProcessingSchema';
import { emailParserV2, ParsedEmailV2 } from './emailParserServiceV2';
import { shadowPublisherConfig, calculateReviewPriority } from '@/lib/config/shadowPublisherConfig';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

export class ShadowPublisherServiceV2 {
  
  async processPublisherFromEmail(
    emailLogId: string,
    emailContent: string,
    senderEmail: string,
    subject?: string,
    campaignType: 'outreach' | 'follow_up' | 'bulk' = 'outreach'
  ): Promise<string | null> {
    try {
      console.log('🚀 ShadowPublisherServiceV2.processPublisherFromEmail called');
      console.log('   Email:', senderEmail);
      console.log('   Subject:', subject);
      console.log('   Content length:', emailContent.length);
      
      // Parse email with V2 parser
      console.log('📤 Calling emailParserV2.parseEmail...');
      const parsedData = await emailParserV2.parseEmail(emailContent, senderEmail, subject);
      
      // Trust the AI: If it found paid offerings, create the publisher
      const hasValidOfferings = parsedData.offerings && parsedData.offerings.length > 0 && 
        parsedData.offerings.some(offer => offer.basePrice && offer.basePrice > 0);
      
      // Store parsed data in email log
      await this.updateEmailLogWithParsedData(emailLogId, parsedData, {
        isQualified: hasValidOfferings,
        status: hasValidOfferings ? 'qualified' : 'disqualified',
        reason: hasValidOfferings ? undefined : 'no_paid_offerings',
        notes: hasValidOfferings ? `AI found ${parsedData.offerings.length} paid offerings` : 'AI found no paid offerings'
      });
      
      // If AI didn't find paid offerings, don't create publisher
      if (!hasValidOfferings) {
        console.log('❌ AI found no paid offerings - no publisher created');
        return null;
      }
      
      console.log('✅ Email qualified for paid database inclusion');
      
      // Find or create publisher (only for qualified emails)
      const result = await this.findOrCreatePublisher(parsedData, emailLogId);
      
      if (!result) {
        console.error('Failed to create publisher');
        await this.addToReviewQueue(emailLogId, parsedData, 'validation_error');
        return null;
      }
      
      const { publisher, isExisting } = result;
      
      if (isExisting) {
        console.log('🔄 Updating existing publisher:', publisher.email);
        await this.handleExistingPublisherUpdate(publisher, parsedData, emailLogId, campaignType, emailContent);
      } else {
        console.log('🆕 Processing new shadow publisher:', publisher.email);
        await this.handleNewShadowPublisher(publisher, parsedData, emailLogId, emailContent);
      }
      
      return publisher.id;
      
    } catch (error) {
      console.error('Failed to process publisher from email:', error);
      await this.logAutomationError(emailLogId, error);
      return null;
    }
  }
  
  private async updateEmailLogWithParsedData(
    emailLogId: string, 
    parsedData: ParsedEmailV2, 
    qualification?: { isQualified: boolean; status: string; reason?: string; notes?: string }
  ) {
    try {
      await db.update(emailProcessingLogs)
        .set({
          parsedData: JSON.stringify(parsedData) as any,
          confidenceScore: parsedData.confidence?.toString(),
          qualificationStatus: qualification?.status || 'pending',
          disqualificationReason: qualification?.reason || null,
          updatedAt: new Date(),
        })
        .where(eq(emailProcessingLogs.id, emailLogId));
    } catch (error) {
      console.error('Failed to update email log with parsed data:', error);
    }
  }
  
  private async findOrCreatePublisher(
    parsedData: ParsedEmailV2,
    emailLogId: string
  ): Promise<{ publisher: any; isExisting: boolean } | null> {
    const email = parsedData.publisher.email.toLowerCase();
    
    // Try to find existing publisher
    let existingPublisher = await this.findExistingPublisher(email);
    
    if (existingPublisher) {
      return { publisher: existingPublisher, isExisting: true };
    }
    
    // Create new shadow publisher
    const newPublisher = await this.createShadowPublisher(parsedData, emailLogId);
    return newPublisher ? { publisher: newPublisher, isExisting: false } : null;
  }
  
  private async findExistingPublisher(email: string) {
    // Match any existing publisher with the same email to prevent duplicates
    const exactMatch = await db
      .select()
      .from(publishers)
      .where(eq(publishers.email, email))
      .orderBy(
        // Prefer active accounts over shadow accounts
        sql`CASE 
          WHEN account_status = 'active' THEN 1 
          WHEN account_status = 'shadow' THEN 2 
          ELSE 3 
        END`,
        // Then prefer verified over unverified
        sql`CASE 
          WHEN email_verified = true THEN 1 
          ELSE 2 
        END`
      )
      .limit(1);
    
    if (exactMatch.length > 0) {
      console.log(`Found existing publisher for ${email}: ${exactMatch[0].id} (status: ${exactMatch[0].accountStatus})`);
      return exactMatch[0];
    }
    
    return null;
  }
  
  private async createShadowPublisher(parsedData: ParsedEmailV2, emailLogId: string) {
    try {
      const [newPublisher] = await db.insert(publishers).values({
        id: crypto.randomUUID(),
        email: parsedData.publisher.email.toLowerCase(),
        contactName: parsedData.publisher.name || 'Unknown',
        companyName: parsedData.publisher.company || null,
        accountStatus: 'shadow',
        status: 'pending',
        emailVerified: false,
        password: this.generateSecureToken(), // Placeholder password
        source: 'email_extraction',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      console.log('✅ Created shadow publisher:', newPublisher.id);
      
      // Log automation action
      await db.insert(publisherAutomationLogs).values({
        id: crypto.randomUUID(),
        emailLogId,
        publisherId: newPublisher.id,
        action: 'shadow_publisher_created',
        actionStatus: 'success',
        metadata: JSON.stringify({
          source: 'emailParserV2',
          confidence: parsedData.confidence,
          extractionNotes: parsedData.extractionNotes,
        }),
        createdAt: new Date(),
      });
      
      return newPublisher;
    } catch (error) {
      console.error('Failed to create shadow publisher:', error);
      return null;
    }
  }
  
  private async handleExistingPublisherUpdate(
    publisher: any,
    parsedData: ParsedEmailV2,
    emailLogId: string,
    campaignType: string,
    emailContent: string
  ) {
    try {
      // Process websites for existing publisher
      for (const websiteDomain of parsedData.publisher.websites) {
        await this.processWebsite(publisher.id, websiteDomain, 0.9);
      }
      
      // Process offerings - update or create
      for (const offering of parsedData.offerings) {
        await this.processOfferingForExistingPublisher(
          publisher.id, 
          offering, 
          parsedData.publisher.websites[0], // Primary website
          emailLogId,
          emailContent
        );
      }
      
      // Process pricing rules
      for (const rule of parsedData.pricingRules) {
        await this.processPricingRule(publisher.id, rule);
      }
      
      // Log the update
      await db.insert(publisherAutomationLogs).values({
        id: crypto.randomUUID(),
        emailLogId,
        publisherId: publisher.id,
        action: 'existing_publisher_updated',
        actionStatus: 'success',
        metadata: JSON.stringify({
          campaignType,
          offeringsCount: parsedData.offerings.length,
          rulesCount: parsedData.pricingRules.length,
          confidence: parsedData.confidence,
        }),
        createdAt: new Date(),
      });
      
    } catch (error) {
      console.error('Failed to update existing publisher:', error);
    }
  }
  
  private async handleNewShadowPublisher(
    publisher: any,
    parsedData: ParsedEmailV2,
    emailLogId: string,
    emailContent: string
  ) {
    try {
      // Process websites
      for (const websiteDomain of parsedData.publisher.websites) {
        await this.processWebsite(publisher.id, websiteDomain, parsedData.confidence);
      }
      
      // Create shadow publisher websites
      for (const websiteDomain of parsedData.publisher.websites) {
        await this.createShadowWebsiteRelation(publisher.id, websiteDomain, parsedData.confidence);
      }
      
      // Process all offerings
      for (const offering of parsedData.offerings) {
        for (const websiteDomain of parsedData.publisher.websites) {
          await this.processOfferingForShadowPublisher(
            publisher.id, 
            offering, 
            websiteDomain, 
            emailLogId,
            emailContent
          );
        }
      }
      
      // Process pricing rules
      for (const rule of parsedData.pricingRules) {
        await this.processPricingRule(publisher.id, rule);
      }
      
      // Add to review queue based on confidence
      const shouldAutoApprove = parsedData.confidence > shadowPublisherConfig.confidence.autoApprove;
      await this.addToReviewQueue(emailLogId, parsedData, 'new_shadow_publisher', shouldAutoApprove);
      
      // Log the creation
      await db.insert(publisherAutomationLogs).values({
        id: crypto.randomUUID(),
        emailLogId,
        publisherId: publisher.id,
        action: 'shadow_publisher_processed',
        actionStatus: 'success',
        metadata: JSON.stringify({
          websitesCount: parsedData.publisher.websites.length,
          offeringsCount: parsedData.offerings.length,
          rulesCount: parsedData.pricingRules.length,
          confidence: parsedData.confidence,
          autoApprove: shouldAutoApprove,
        }),
        createdAt: new Date(),
      });
      
    } catch (error) {
      console.error('Failed to process new shadow publisher:', error);
    }
  }
  
  private async processWebsite(publisherId: string, websiteDomain: string, confidence: number) {
    try {
      const normalizedDomain = normalizeDomain(websiteDomain).domain;
      
      // Check if website exists, create if not
      let [website] = await db
        .select()
        .from(websites)
        .where(eq(websites.domain, normalizedDomain))
        .limit(1);
      
      if (!website) {
        console.log('Creating new website:', normalizedDomain);
        [website] = await db.insert(websites).values({
          id: crypto.randomUUID(),
          domain: normalizedDomain,
          airtableCreatedAt: new Date(),
          airtableUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
      }
      
      return website;
      
    } catch (error) {
      console.error('Failed to process website:', error);
      return null;
    }
  }
  
  private async createShadowWebsiteRelation(publisherId: string, websiteDomain: string, confidence: number) {
    try {
      const normalizedDomain = normalizeDomain(websiteDomain).domain;
      const website = await this.processWebsite(publisherId, websiteDomain, confidence);
      
      if (!website) return;
      
      // Check if shadow relation exists
      const existing = await db
        .select()
        .from(shadowPublisherWebsites)
        .where(
          and(
            eq(shadowPublisherWebsites.publisherId, publisherId),
            eq(shadowPublisherWebsites.websiteId, website.id)
          )
        )
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(shadowPublisherWebsites).values({
          publisherId,
          websiteId: website.id,
          confidence: confidence.toFixed(2),
          source: 'email_extraction_v2',
          extractionMethod: 'ai_schema_based',
          verified: false
        });
      }
      
    } catch (error) {
      console.error('Failed to create shadow website relation:', error);
    }
  }
  
  private async processOfferingForShadowPublisher(
    publisherId: string,
    offering: ParsedEmailV2['offerings'][0],
    websiteDomain: string,
    emailLogId: string,
    emailContent: string
  ) {
    try {
      const normalizedDomain = normalizeDomain(websiteDomain).domain;
      const website = await this.processWebsite(publisherId, websiteDomain, 0.9);
      
      if (!website) return;
      
      // Check if offering exists
      const existing = await db
        .select()
        .from(publisherOfferings)
        .where(
          and(
            eq(publisherOfferings.publisherId, publisherId),
            eq(publisherOfferings.offeringType, offering.offeringType)
          )
        )
        .limit(1);
      
      if (existing.length === 0) {
        // Create new offering from V2 data with source email tracking
        const [newOffering] = await db.insert(publisherOfferings).values({
          publisherId, // Override the 'PENDING' value
          offeringType: offering.offeringType,
          basePrice: offering.basePrice,
          currency: offering.currency,
          turnaroundDays: offering.turnaroundDays,
          currentAvailability: offering.currentAvailability,
          expressAvailable: offering.expressAvailable,
          expressPrice: offering.expressPrice,
          expressDays: offering.expressDays,
          offeringName: offering.offeringName,
          minWordCount: offering.minWordCount,
          maxWordCount: offering.maxWordCount,
          niches: offering.niches,
          languages: offering.languages,
          attributes: offering.attributes,
          isActive: offering.isActive,
          // ✅ NEW: Source email tracking for audit trail
          // sourceEmailId: emailLogId, // Field doesn't exist
          // sourceEmailContent: this.extractRelevantEmailContent(emailContent, offering), // Field doesn't exist
          // pricingExtractedFrom: this.extractPricingQuote(emailContent, offering), // Field doesn't exist
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        
        // Create offering-website relationship
        await db.insert(publisherOfferingRelationships).values({
          publisherId,
          offeringId: newOffering.id,
          websiteId: website.id,
          isPrimary: true,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`✅ Created offering: ${offering.offeringType} for ${normalizedDomain}`);
      }
      
    } catch (error) {
      console.error('Failed to process offering for shadow publisher:', error);
    }
  }
  
  private async processOfferingForExistingPublisher(
    publisherId: string,
    offering: ParsedEmailV2['offerings'][0],
    websiteDomain: string,
    emailLogId: string,
    emailContent: string
  ) {
    try {
      const normalizedDomain = normalizeDomain(websiteDomain).domain;
      const website = await this.processWebsite(publisherId, websiteDomain, 0.9);
      
      if (!website) return;
      
      // Check if offering exists
      const existing = await db
        .select()
        .from(publisherOfferings)
        .where(
          and(
            eq(publisherOfferings.publisherId, publisherId),
            eq(publisherOfferings.offeringType, offering.offeringType),
            // Match on name if provided for better deduplication
            offering.offeringName ? eq(publisherOfferings.offeringName, offering.offeringName) : sql`1=1`
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing offering with V2 data
        await db.update(publisherOfferings)
          .set({
            basePrice: offering.basePrice,
            currency: offering.currency,
            turnaroundDays: offering.turnaroundDays,
            expressAvailable: offering.expressAvailable,
            expressPrice: offering.expressPrice,
            expressDays: offering.expressDays,
            minWordCount: offering.minWordCount,
            maxWordCount: offering.maxWordCount,
            niches: offering.niches,
            languages: offering.languages,
            attributes: Object.assign({}, existing[0].attributes || {}, offering.attributes || {}),
            // ✅ NEW: Update source email tracking for audit trail
            // sourceEmailId: emailLogId, // Field doesn't exist
            // sourceEmailContent: this.extractRelevantEmailContent(emailContent, offering), // Field doesn't exist
            // pricingExtractedFrom: this.extractPricingQuote(emailContent, offering), // Field doesn't exist
            updatedAt: new Date(),
          })
          .where(eq(publisherOfferings.id, existing[0].id));
          
        console.log(`📝 Updated offering: ${offering.offeringType}`);
      } else {
        // Create new offering for existing publisher
        const [newOffering] = await db.insert(publisherOfferings).values({
          publisherId, // Override the 'PENDING' value
          offeringType: offering.offeringType,
          basePrice: offering.basePrice,
          currency: offering.currency,
          turnaroundDays: offering.turnaroundDays,
          currentAvailability: 'available', // Mark as available for existing publishers
          expressAvailable: offering.expressAvailable,
          expressPrice: offering.expressPrice,
          expressDays: offering.expressDays,
          offeringName: offering.offeringName,
          minWordCount: offering.minWordCount,
          maxWordCount: offering.maxWordCount,
          niches: offering.niches,
          languages: offering.languages,
          attributes: offering.attributes,
          isActive: true, // Activate for existing publishers
          // ✅ NEW: Source email tracking for audit trail
          // sourceEmailId: emailLogId, // Field doesn't exist
          // sourceEmailContent: this.extractRelevantEmailContent(emailContent, offering), // Field doesn't exist
          // pricingExtractedFrom: this.extractPricingQuote(emailContent, offering), // Field doesn't exist
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        
        // Create offering-website relationship
        await db.insert(publisherOfferingRelationships).values({
          publisherId,
          offeringId: newOffering.id,
          websiteId: website.id,
          isPrimary: true,
          isActive: true, // Activate for existing publishers
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`✅ Created offering: ${offering.offeringType} for existing publisher`);
      }
      
    } catch (error) {
      console.error('Failed to process offering for existing publisher:', error);
    }
  }
  
  private async processPricingRule(publisherId: string, rule: ParsedEmailV2['pricingRules'][0]) {
    try {
      // Find relevant offerings for this rule
      const offerings = await db
        .select()
        .from(publisherOfferings)
        .where(
          and(
            eq(publisherOfferings.publisherId, publisherId),
            eq(publisherOfferings.offeringType, rule.forOfferingType)
          )
        );
      
      for (const offering of offerings) {
        // Check if similar rule exists
        const existingRules = await db
          .select()
          .from(publisherPricingRules)
          .where(
            and(
              eq(publisherPricingRules.publisherOfferingId, offering.id),
              eq(publisherPricingRules.ruleType, rule.ruleType),
              eq(publisherPricingRules.ruleName, rule.ruleName)
            )
          )
          .limit(1);
        
        if (existingRules.length === 0) {
          // Create new pricing rule
          await db.insert(publisherPricingRules).values({
            id: crypto.randomUUID(),
            publisherOfferingId: offering.id,
            ruleType: rule.ruleType,
            ruleName: rule.ruleName,
            description: rule.description,
            conditions: rule.conditions,
            actions: rule.actions,
            priority: rule.priority,
            isCumulative: rule.isCumulative,
            autoApply: rule.autoApply,
            requiresApproval: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          console.log(`✅ Created pricing rule: ${rule.ruleName}`);
        }
      }
      
    } catch (error) {
      console.error('Failed to process pricing rule:', error);
    }
  }
  
  async addToReviewQueue(
    emailLogId: string,
    parsedData: ParsedEmailV2,
    reason: string,
    autoApprove: boolean = false
  ) {
    try {
      console.log('📝 Adding to review queue:', emailLogId, 'reason:', reason);
      
      // Calculate priority based on confidence
      const priority = Math.round((1 - parsedData.confidence) * 100);
      
      const autoApproveAt = autoApprove 
        ? new Date(Date.now() + shadowPublisherConfig.review.autoApprovalDelayHours * 60 * 60 * 1000)
        : null;
      
      await db.insert(emailReviewQueue).values({
        id: crypto.randomUUID(),
        logId: emailLogId,
        priority,
        status: 'pending',
        queueReason: reason,
        suggestedActions: JSON.stringify({
          confidence: parsedData.confidence,
          extractedData: parsedData,
          extractionNotes: parsedData.extractionNotes,
        }),
        missingFields: JSON.stringify([]), // V2 parser handles all fields
        autoApproveAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log('✅ Successfully added to review queue');
      
    } catch (error) {
      console.error('Failed to add to review queue:', error);
    }
  }
  
  private async logAutomationError(emailLogId: string, error: any) {
    try {
      await db.insert(publisherAutomationLogs).values({
        id: crypto.randomUUID(),
        emailLogId,
        action: 'error',
        actionStatus: 'failed',
        metadata: JSON.stringify({
          error: error.message || 'Unknown error',
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }),
        createdAt: new Date(),
      });
    } catch (logError) {
      console.error('Failed to log automation error:', logError);
    }
  }
  
  private generateSecureToken(): string {
    const entropy = [
      crypto.randomBytes(32),
      Buffer.from(Date.now().toString()),
      Buffer.from(process.pid.toString())
    ];
    return crypto.createHash('sha256')
      .update(Buffer.concat(entropy))
      .digest('hex');
  }

  /**
   * Extract relevant portions of email content for audit trail
   */
  private extractRelevantEmailContent(emailContent: string, offering: any): string {
    // Keep first 1000 characters of email for context
    // This preserves the pricing discussion without storing full thread
    return emailContent.substring(0, 1000) + (emailContent.length > 1000 ? '...' : '');
  }

  /**
   * Extract the specific pricing quote from email content
   */
  private extractPricingQuote(emailContent: string, offering: any): string {
    const content = emailContent.toLowerCase();
    const price = offering.basePrice;
    
    // Try to find the sentence containing the pricing
    const sentences = emailContent.split(/[.!?]/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      // Look for sentences containing currency symbols or price-related words
      if (lowerSentence.includes('$') || 
          lowerSentence.includes('€') || 
          lowerSentence.includes('£') ||
          lowerSentence.includes('price') ||
          lowerSentence.includes('cost') ||
          lowerSentence.includes('fee') ||
          lowerSentence.includes('charge')) {
        return sentence.trim();
      }
    }
    
    // Fallback: return portion around currency symbols
    const match = emailContent.match(/.{0,50}[\$€£][0-9,]+.{0,50}/);
    return match ? match[0] : `Extracted from email - basePrice: ${price} cents`;
  }
}

// Export singleton instance
export const shadowPublisherServiceV2 = new ShadowPublisherServiceV2();