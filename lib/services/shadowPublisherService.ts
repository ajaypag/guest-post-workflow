import { db } from '@/lib/db/connection';
import { publishers, publisherWebsites } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferings, publisherOfferingRelationships, publisherPricingRules } from '@/lib/db/publisherSchemaActual';
import { 
  emailReviewQueue, 
  publisherAutomationLogs,
  shadowPublisherWebsites 
} from '@/lib/db/emailProcessingSchema';
import { ParsedEmailData } from './emailParserService';
import { shadowPublisherConfig, calculateReviewPriority } from '@/lib/config/shadowPublisherConfig';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import crypto from 'crypto';

export class ShadowPublisherService {
  
  async processPublisherFromEmail(
    emailLogId: string,
    parsedData: ParsedEmailData,
    campaignType: 'outreach' | 'follow_up' | 'bulk'
  ) {
    try {
      // Find or create publisher
      const result = await this.findOrCreatePublisher(parsedData, emailLogId);
      
      if (!result) {
        // Add to review queue if we couldn't create publisher
        await this.addToReviewQueue(emailLogId, parsedData, 'validation_error');
        return;
      }
      
      const { publisher, isExisting } = result;
      
      if (isExisting) {
        // Handle existing publisher - update their data, don't create shadow entities
        await this.handleExistingPublisherUpdate(publisher, parsedData, emailLogId, campaignType);
      } else {
        // Handle new shadow publisher - full processing pipeline
        await this.handleNewShadowPublisher(publisher, parsedData, emailLogId);
      }
      
    } catch (error) {
      console.error('Failed to process publisher from email:', error);
      await this.logAutomationError(emailLogId, error);
    }
  }
  
  private async findOrCreatePublisher(
    parsedData: ParsedEmailData,
    emailLogId: string
  ): Promise<{ publisher: any; isExisting: boolean } | null> {
    const email = parsedData.sender.email.toLowerCase();
    
    // Try to find existing publisher
    let existingPublisher = await this.findExistingPublisher(email, parsedData);
    
    if (existingPublisher) {
      // Found existing publisher - return with flag
      return { publisher: existingPublisher, isExisting: true };
    }
    
    // Create new shadow publisher
    const newPublisher = await this.createShadowPublisher(parsedData, emailLogId);
    return newPublisher ? { publisher: newPublisher, isExisting: false } : null;
  }
  
  private async findExistingPublisher(email: string, parsedData: ParsedEmailData) {
    // 1. Exact email match (for active accounts only)
    const exactMatch = await db
      .select()
      .from(publishers)
      .where(
        and(
          eq(publishers.email, email),
          sql`${publishers.accountStatus} NOT IN ('unclaimed', 'shadow')`
        )
      )
      .limit(1);
    
    if (exactMatch.length > 0) {
      return exactMatch[0];
    }
    
    // 2. Domain match - email domain matches website domain
    if (parsedData.websites.length > 0) {
      const emailDomain = email.split('@')[1];
      for (const website of parsedData.websites) {
        if (website.domain.includes(emailDomain) || emailDomain.includes(website.domain)) {
          // Find publisher associated with this website
          const websiteRecord = await db
            .select()
            .from(websites)
            .where(eq(websites.domain, website.domain))
            .limit(1);
          
          if (websiteRecord.length > 0) {
            const publisherWebsite = await db
              .select()
              .from(publisherWebsites)
              .where(eq(publisherWebsites.websiteId, websiteRecord[0].id))
              .limit(1);
            
            if (publisherWebsite.length > 0) {
              const publisher = await db
                .select()
                .from(publishers)
                .where(eq(publishers.id, publisherWebsite[0].publisherId))
                .limit(1);
              
              if (publisher.length > 0) {
                return publisher[0];
              }
            }
          }
        }
      }
    }
    
    // 3. Fuzzy name match - similar company/contact names
    if (parsedData.sender.company) {
      const fuzzyMatch = await db
        .select()
        .from(publishers)
        .where(
          or(
            ilike(publishers.companyName, `%${parsedData.sender.company}%`),
            ilike(publishers.contactName, `%${parsedData.sender.name || ''}%`)
          )
        )
        .limit(1);
      
      if (fuzzyMatch.length > 0) {
        return fuzzyMatch[0];
      }
    }
    
    return null;
  }
  
  private async createShadowPublisher(
    parsedData: ParsedEmailData,
    emailLogId: string
  ) {
    try {
      const invitationToken = this.generateSecureToken();
      
      const [newPublisher] = await db.insert(publishers).values({
        id: crypto.randomUUID(),
        email: parsedData.sender.email.toLowerCase(),
        contactName: parsedData.sender.name || 'Unknown',
        companyName: parsedData.sender.company || undefined,
        accountStatus: 'shadow',
        source: 'manyreach',
        sourceMetadata: JSON.stringify({ emailLogId }),
        confidenceScore: parsedData.overallConfidence.toFixed(2),
        invitationToken,
        invitationExpiresAt: new Date(Date.now() + shadowPublisherConfig.invitation.expiryDays * 24 * 60 * 60 * 1000),
        status: 'pending',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      // Log automation action
      await db.insert(publisherAutomationLogs).values({
        id: crypto.randomUUID(),
        emailLogId,
        publisherId: newPublisher.id,
        action: 'created',
        actionStatus: 'success',
        newData: JSON.stringify(parsedData),
        confidence: parsedData.overallConfidence.toFixed(2),
        matchMethod: 'new_creation',
        metadata: JSON.stringify({
          source: 'manyreach',
          confidence: parsedData.overallConfidence,
        }),
        createdAt: new Date(),
      });
      
      return newPublisher;
      
    } catch (error) {
      console.error('Failed to create shadow publisher:', error);
      throw error;
    }
  }
  
  private async handleExistingPublisherUpdate(
    publisher: any,
    parsedData: ParsedEmailData,
    emailLogId: string,
    campaignType: 'outreach' | 'follow_up' | 'bulk'
  ) {
    try {
      // Update publisher basic info if confidence is high
      const updates: any = {
        updatedAt: new Date(),
      };
      
      // Only update if new data has higher confidence
      if (parsedData.sender.name && parsedData.sender.confidence > 0.7) {
        updates.contactName = parsedData.sender.name;
      }
      
      if (parsedData.sender.company && parsedData.sender.confidence > 0.7) {
        updates.companyName = parsedData.sender.company;
      }
      
      if (Object.keys(updates).length > 1) { // More than just updatedAt
        await db.update(publishers)
          .set(updates)
          .where(eq(publishers.id, publisher.id));
      }
      
      // Process website associations for existing publisher
      for (const websiteData of parsedData.websites) {
        await this.processExistingPublisherWebsite(publisher.id, websiteData, emailLogId);
      }
      
      // Update existing offerings with new pricing/details
      for (const offering of parsedData.offerings) {
        await this.updateExistingPublisherOffering(
          publisher.id, 
          offering, 
          parsedData.websites[0]?.domain, 
          emailLogId
        );
      }
      
      // Log automation action
      await db.insert(publisherAutomationLogs).values({
        id: crypto.randomUUID(),
        emailLogId,
        publisherId: publisher.id,
        action: 'existing_publisher_updated',
        actionStatus: 'success',
        newData: JSON.stringify(parsedData),
        confidence: parsedData.overallConfidence.toFixed(2),
        matchMethod: 'existing_publisher_update',
        metadata: JSON.stringify({
          source: 'manyreach',
          confidence: parsedData.overallConfidence,
          publisherStatus: publisher.accountStatus,
          campaignType,
        }),
        createdAt: new Date(),
      });
      
      // For existing active publishers, don't add to review queue
      // Just update their data and log the interaction
      
    } catch (error) {
      console.error('Failed to handle existing publisher update:', error);
      throw error;
    }
  }
  
  private async processWebsite(
    publisherId: string,
    websiteData: { domain: string; confidence: number },
    emailLogId: string
  ) {
    try {
      // Check if website exists
      let [website] = await db
        .select()
        .from(websites)
        .where(eq(websites.domain, websiteData.domain))
        .limit(1);
      
      if (!website) {
        // Create new website
        [website] = await db.insert(websites).values({
          id: crypto.randomUUID(),
          domain: websiteData.domain,
          source: 'manyreach',
          status: 'pending',
          airtableCreatedAt: new Date(),
          airtableUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
      }
      
      // Create shadow publisher website relationship
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
          id: crypto.randomUUID(),
          publisherId,
          websiteId: website.id,
          confidence: websiteData.confidence.toFixed(2),
          source: 'email_extraction',
          extractionMethod: 'ai_extracted',
          verified: false,
          createdAt: new Date(),
        });
      }
      
    } catch (error) {
      console.error('Failed to process website:', error);
    }
  }
  
  private async processOffering(
    publisherId: string,
    offering: ParsedEmailData['offerings'][0],
    websiteDomain: string | undefined,
    emailLogId: string
  ) {
    if (!websiteDomain) return;
    
    try {
      // Get website
      const [website] = await db
        .select()
        .from(websites)
        .where(eq(websites.domain, websiteDomain))
        .limit(1);
      
      if (!website) return;
      
      // Check if offering exists for this publisher
      const existing = await db
        .select()
        .from(publisherOfferings)
        .where(
          and(
            eq(publisherOfferings.publisherId, publisherId),
            eq(publisherOfferings.offeringType, offering.type)
          )
        )
        .limit(1);
      
      if (existing.length === 0) {
        // Prepare attributes with restricted niches
        const attributes: any = {};
        if (offering.requirements?.prohibitedTopics && offering.requirements.prohibitedTopics.length > 0) {
          attributes.restrictions = {
            niches: offering.requirements.prohibitedTopics
          };
        }
        
        // Create new offering
        const [newOffering] = await db.insert(publisherOfferings).values({
          publisherId,
          offeringType: offering.type,
          basePrice: offering.basePrice ? Math.round(offering.basePrice) : 0,
          currency: offering.currency || 'USD',
          turnaroundDays: offering.turnaroundDays || 7,
          currentAvailability: 'pending_verification',
          isActive: false,
          attributes: Object.keys(attributes).length > 0 ? attributes : {},
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
        
        // Create niche pricing rules if available
        if (offering.nichePricing && offering.nichePricing.length > 0) {
          for (const nichePriceRule of offering.nichePricing) {
            await db.insert(publisherPricingRules).values({
              id: crypto.randomUUID(),
              publisherOfferingId: newOffering.id,
              ruleType: 'niche',
              ruleName: `${nichePriceRule.niche} Pricing`,
              description: nichePriceRule.notes || `Special pricing for ${nichePriceRule.niche} content`,
              conditions: {
                type: 'niche_match',
                niches: [nichePriceRule.niche]
              },
              actions: {
                adjustmentType: nichePriceRule.adjustmentType,
                adjustmentValue: nichePriceRule.adjustmentValue
              },
              priority: 10,
              isCumulative: false,
              autoApply: true,
              requiresApproval: false,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      } else {
        // Update existing offering if confidence is high
        if (offering.confidence > 0.8) {
          await db.update(publisherOfferings)
            .set({
              basePrice: offering.basePrice ? Math.round(offering.basePrice) : existing[0].basePrice,
              currency: offering.currency || existing[0].currency,
              turnaroundDays: offering.turnaroundDays || existing[0].turnaroundDays,
              updatedAt: new Date(),
            })
            .where(eq(publisherOfferings.id, existing[0].id));
        }
      }
      
    } catch (error) {
      console.error('Failed to process offering:', error);
    }
  }
  
  async addToReviewQueue(
    emailLogId: string,
    parsedData: ParsedEmailData,
    reason: string,
    autoApprove: boolean = false
  ) {
    try {
      // Calculate priority using configuration
      const priority = calculateReviewPriority(
        parsedData.overallConfidence,
        parsedData.missingFields
      );
      
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
          missingFields: parsedData.missingFields,
          confidence: parsedData.overallConfidence,
          extractedData: parsedData,
        }),
        missingFields: JSON.stringify(parsedData.missingFields || []),
        autoApproveAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
    } catch (error) {
      console.error('Failed to add to review queue:', error);
    }
  }
  
  private async autoApprove(publisherId: string, emailLogId: string) {
    try {
      // Update publisher status to active
      await db.update(publishers)
        .set({
          accountStatus: 'active',
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(publishers.id, publisherId));
      
      // Log automation action
      await db.insert(publisherAutomationLogs).values({
        id: crypto.randomUUID(),
        emailLogId,
        publisherId,
        action: 'auto_approved',
        actionStatus: 'success',
        metadata: JSON.stringify({
          reason: 'high_confidence',
          timestamp: new Date().toISOString(),
        }),
        createdAt: new Date(),
      });
      
    } catch (error) {
      console.error('Failed to auto-approve publisher:', error);
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
  
  private async handleNewShadowPublisher(
    publisher: any,
    parsedData: ParsedEmailData,
    emailLogId: string
  ) {
    try {
      // Process websites for shadow publisher
      for (const websiteData of parsedData.websites) {
        await this.processWebsite(publisher.id, websiteData, emailLogId);
      }
      
      // Process offerings for shadow publisher
      for (const offering of parsedData.offerings) {
        await this.processOffering(publisher.id, offering, parsedData.websites[0]?.domain, emailLogId);
      }
      
      // Determine if auto-approval is appropriate using config
      const config = shadowPublisherConfig.confidence;
      
      if (parsedData.overallConfidence >= config.autoApprove) {
        // High confidence - auto-approve
        await this.autoApprove(publisher.id, emailLogId);
      } else if (parsedData.overallConfidence >= config.mediumReview) {
        // Medium confidence - add to review with auto-approval timer
        await this.addToReviewQueue(emailLogId, parsedData, 'medium_confidence', true);
      } else if (parsedData.overallConfidence >= config.lowReview) {
        // Low confidence - manual review required
        await this.addToReviewQueue(emailLogId, parsedData, 'low_confidence');
      } else {
        // Very low confidence - add to review with warning
        await this.addToReviewQueue(emailLogId, parsedData, 'very_low_confidence');
      }
      
    } catch (error) {
      console.error('Failed to handle new shadow publisher:', error);
      throw error;
    }
  }
  
  private async processExistingPublisherWebsite(
    publisherId: string,
    websiteData: { domain: string; confidence: number },
    emailLogId: string
  ) {
    try {
      // Check if website exists
      let [website] = await db
        .select()
        .from(websites)
        .where(eq(websites.domain, websiteData.domain))
        .limit(1);
      
      if (!website) {
        // Create new website
        [website] = await db.insert(websites).values({
          id: crypto.randomUUID(),
          domain: websiteData.domain,
          source: 'manyreach',
          status: 'active', // For existing publishers, mark as active
          airtableCreatedAt: new Date(),
          airtableUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
      }
      
      // Check if publisher already has this website associated
      const existingAssociation = await db
        .select()
        .from(publisherWebsites)
        .where(
          and(
            eq(publisherWebsites.publisherId, publisherId),
            eq(publisherWebsites.websiteId, website.id)
          )
        )
        .limit(1);
      
      if (existingAssociation.length === 0) {
        // Create normal publisher-website relationship (not shadow)
        await db.insert(publisherWebsites).values({
          id: crypto.randomUUID(),
          publisherId,
          websiteId: website.id,
          addedAt: new Date(),
        });
      }
      
    } catch (error) {
      console.error('Failed to process existing publisher website:', error);
    }
  }
  
  private async updateExistingPublisherOffering(
    publisherId: string,
    offering: ParsedEmailData['offerings'][0],
    websiteDomain: string | undefined,
    emailLogId: string
  ) {
    if (!websiteDomain) return;
    
    try {
      // Get website
      const [website] = await db
        .select()
        .from(websites)
        .where(eq(websites.domain, websiteDomain))
        .limit(1);
      
      if (!website) return;
      
      // Check if offering exists for this publisher
      const existing = await db
        .select()
        .from(publisherOfferings)
        .where(
          and(
            eq(publisherOfferings.publisherId, publisherId),
            eq(publisherOfferings.offeringType, offering.type)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing offering if confidence is reasonable
        if (offering.confidence > 0.6) {
          const updates: any = {
            updatedAt: new Date(),
          };
          
          // Update pricing if provided and confident
          if (offering.basePrice && offering.confidence > 0.7) {
            updates.basePrice = Math.round(offering.basePrice);
          }
          
          if (offering.currency && offering.confidence > 0.7) {
            updates.currency = offering.currency;
          }
          
          if (offering.turnaroundDays && offering.confidence > 0.7) {
            updates.turnaroundDays = offering.turnaroundDays;
          }
          
          await db.update(publisherOfferings)
            .set(updates)
            .where(eq(publisherOfferings.id, existing[0].id));
        }
      } else {
        // Prepare attributes with restricted niches for existing publisher
        const attributes: any = {};
        if (offering.requirements?.prohibitedTopics && offering.requirements.prohibitedTopics.length > 0) {
          attributes.restrictions = {
            niches: offering.requirements.prohibitedTopics
          };
        }
        
        // Create new offering for existing publisher
        const [newOffering] = await db.insert(publisherOfferings).values({
          publisherId,
          offeringType: offering.type,
          basePrice: offering.basePrice ? Math.round(offering.basePrice) : 0,
          currency: offering.currency || 'USD',
          turnaroundDays: offering.turnaroundDays || 7,
          currentAvailability: 'available', // For existing publishers, mark as available
          isActive: true, // For existing publishers, activate immediately
          attributes: Object.keys(attributes).length > 0 ? attributes : {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        
        // Create offering-website relationship
        await db.insert(publisherOfferingRelationships).values({
          publisherId,
          offeringId: newOffering.id,
          websiteId: website.id,
          isPrimary: true,
          isActive: true, // For existing publishers, activate immediately
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Create niche pricing rules for existing publishers
        if (offering.nichePricing && offering.nichePricing.length > 0) {
          for (const nichePriceRule of offering.nichePricing) {
            await db.insert(publisherPricingRules).values({
              id: crypto.randomUUID(),
              publisherOfferingId: newOffering.id,
              ruleType: 'niche',
              ruleName: `${nichePriceRule.niche} Pricing`,
              description: nichePriceRule.notes || `Special pricing for ${nichePriceRule.niche} content`,
              conditions: {
                type: 'niche_match',
                niches: [nichePriceRule.niche]
              },
              actions: {
                adjustmentType: nichePriceRule.adjustmentType,
                adjustmentValue: nichePriceRule.adjustmentValue
              },
              priority: 10,
              isCumulative: false,
              autoApply: true,
              requiresApproval: false,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to update existing publisher offering:', error);
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
}