import { db } from '@/lib/db/connection';
import { 
  publisherOfferingRelationships,
  publisherOfferings,
  publisherPerformance,
  publisherPricingRules,
  OFFERING_TYPES,
  type PublisherOfferingRelationship,
  type NewPublisherOfferingRelationship,
  type PublisherOffering,
  type NewPublisherOffering,
  type PublisherPerformance,
  type NewPublisherPerformance,
  type PublisherPricingRule,
  type NewPublisherPricingRule
} from '@/lib/db/publisherSchemaActual';
import { publishers } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';

// Validation constants
const VALID_OFFERING_TYPES = Object.values(OFFERING_TYPES);
const MAX_PRICE = 100000; // $100k max
const MIN_PRICE = 0.01; // $0.01 min

export class PublisherOfferingsService {
  // ============================================================================
  // Input Validation Methods
  // ============================================================================
  
  private validateOfferingData(data: any): void {
    // Validate offering type
    if (data.offeringType && !VALID_OFFERING_TYPES.includes(data.offeringType)) {
      throw new Error(`Invalid offering type. Must be one of: ${VALID_OFFERING_TYPES.join(', ')}`);
    }
    
    // Validate price
    if (data.basePrice !== undefined) {
      if (typeof data.basePrice !== 'number' || isNaN(data.basePrice)) {
        throw new Error('Base price must be a valid number');
      }
      if (data.basePrice < MIN_PRICE) {
        throw new Error(`Base price must be at least $${MIN_PRICE}`);
      }
      if (data.basePrice > MAX_PRICE) {
        throw new Error(`Base price cannot exceed $${MAX_PRICE}`);
      }
    }
    
    // Validate turnaround days
    if (data.turnaroundDays !== undefined && data.turnaroundDays !== null) {
      if (typeof data.turnaroundDays !== 'number' || data.turnaroundDays < 1 || data.turnaroundDays > 365) {
        throw new Error('Turnaround days must be between 1 and 365');
      }
    }
    
    // Validate word counts
    if (data.minWordCount !== undefined && data.minWordCount !== null) {
      if (typeof data.minWordCount !== 'number' || data.minWordCount < 0) {
        throw new Error('Minimum word count cannot be negative');
      }
    }
    if (data.maxWordCount !== undefined && data.maxWordCount !== null) {
      if (typeof data.maxWordCount !== 'number' || data.maxWordCount < 0) {
        throw new Error('Maximum word count cannot be negative');
      }
      if (data.minWordCount && data.maxWordCount < data.minWordCount) {
        throw new Error('Maximum word count must be greater than minimum word count');
      }
    }
  }
  
  private validatePublisherId(publisherId: string): void {
    if (!publisherId || typeof publisherId !== 'string' || publisherId.trim().length === 0) {
      throw new Error('Publisher ID is required and must be a non-empty string');
    }
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(publisherId)) {
      throw new Error('Publisher ID must be a valid UUID');
    }
  }

  // ============================================================================
  // Publisher-Website Relationships
  // ============================================================================

  /**
   * Create a new relationship between a publisher and website
   */
  async createRelationship(
    publisherId: string,
    websiteId: string,
    offeringId: string,
    data: Partial<NewPublisherOfferingRelationship> = {}
  ): Promise<PublisherOfferingRelationship> {
    const [relationship] = await db
      .insert(publisherOfferingRelationships)
      .values({
        publisherId,
        websiteId,
        offeringId,
        isPrimary: data.isPrimary || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        customTerms: data.customTerms || {},
        ...data
      })
      .returning();

    return relationship;
  }

  /**
   * Update an existing publisher-website relationship
   */
  async updateRelationship(
    id: string,
    updates: Partial<PublisherOfferingRelationship>
  ): Promise<PublisherOfferingRelationship> {
    const [updated] = await db
      .update(publisherOfferingRelationships)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(publisherOfferingRelationships.id, id))
      .returning();

    return updated;
  }

  /**
   * Get all websites managed by a publisher
   */
  async getPublisherWebsites(publisherId: string) {
    const relationships = await db
      .select({
        relationship: publisherOfferingRelationships,
        website: websites
      })
      .from(publisherOfferingRelationships)
      .innerJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
      .where(
        and(
          eq(publisherOfferingRelationships.publisherId, publisherId),
          eq(publisherOfferingRelationships.isActive, true)
        )
      )
      .orderBy(asc(publisherOfferingRelationships.priorityRank));

    return relationships;
  }

  /**
   * Get all publishers managing a website
   */
  async getWebsitePublishers(websiteId: string) {
    const relationships = await db
      .select({
        relationship: publisherOfferingRelationships,
        publisher: publishers
      })
      .from(publisherOfferingRelationships)
      .innerJoin(publishers, eq(publisherOfferingRelationships.publisherId, publishers.id))
      .where(
        and(
          eq(publisherOfferingRelationships.websiteId, websiteId),
          eq(publisherOfferingRelationships.isActive, true)
        )
      )
      .orderBy(asc(publisherOfferingRelationships.priorityRank));

    return relationships;
  }

  /**
   * Get the preferred publisher for a website
   */
  async getPreferredPublisher(websiteId: string) {
    const [preferred] = await db
      .select({
        relationship: publisherOfferingRelationships,
        publisher: publishers
      })
      .from(publisherOfferingRelationships)
      .innerJoin(publishers, eq(publisherOfferingRelationships.publisherId, publishers.id))
      .where(
        and(
          eq(publisherOfferingRelationships.websiteId, websiteId),
          eq(publisherOfferingRelationships.isActive, true),
          eq(publisherOfferingRelationships.isPreferred, true)
        )
      )
      .limit(1);

    return preferred;
  }

  // ============================================================================
  // Offerings Management
  // ============================================================================

  /**
   * Create a new offering for a publisher (DEPRECATED - creates orphaned offerings!)
   * @deprecated Use createOfferingWithRelationship instead
   */
  async createOffering(
    publisherId: string,
    offeringData: Omit<NewPublisherOffering, 'publisherId'>
  ): Promise<PublisherOffering> {
    throw new Error('DEPRECATED: Use createOfferingWithRelationship to ensure offerings are properly linked to websites');
  }

  /**
   * Create a new offering with proper website relationship
   */
  async createOfferingWithRelationship(
    relationshipId: string,
    offeringData: Omit<NewPublisherOffering, 'publisherId'>
  ): Promise<{ offering: PublisherOffering; relationship: PublisherOfferingRelationship }> {
    // Validate relationship exists
    const relationship = await db
      .select()
      .from(publisherOfferingRelationships)
      .where(eq(publisherOfferingRelationships.id, relationshipId))
      .limit(1);
      
    if (relationship.length === 0) {
      throw new Error('Publisher-website relationship not found');
    }

    const publisherId = relationship[0].publisherId;
    
    // Validate inputs
    this.validatePublisherId(publisherId);
    this.validateOfferingData(offeringData);
    
    // Create the offering
    const [offering] = await db
      .insert(publisherOfferings)
      .values({
        publisherId: publisherId,
        ...offeringData
      })
      .returning();

    // Update the relationship to link to this offering
    const [updatedRelationship] = await db
      .update(publisherOfferingRelationships)
      .set({
        offeringId: offering.id,
        updatedAt: new Date()
      })
      .where(eq(publisherOfferingRelationships.id, relationshipId))
      .returning();

    return {
      offering,
      relationship: updatedRelationship
    };
  }

  /**
   * Update an existing offering
   */
  async updateOffering(
    id: string,
    updates: Partial<PublisherOffering>
  ): Promise<PublisherOffering> {
    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw new Error('Offering ID is required');
    }
    this.validateOfferingData(updates);
    
    // Verify offering exists
    const existingOffering = await db
      .select()
      .from(publisherOfferings)
      .where(eq(publisherOfferings.id, id))
      .limit(1);
      
    if (existingOffering.length === 0) {
      throw new Error('Offering not found');
    }

    const [updated] = await db
      .update(publisherOfferings)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(publisherOfferings.id, id))
      .returning();

    return updated;
  }

  /**
   * Get all offerings for a website
   */
  async getWebsiteOfferings(websiteId: string, activeOnly = true) {
    const whereCondition = activeOnly
      ? and(
          eq(publisherOfferingRelationships.websiteId, websiteId),
          eq(publisherOfferings.isActive, true),
          eq(publisherOfferingRelationships.isActive, true)
        )
      : eq(publisherOfferingRelationships.websiteId, websiteId);

    const offerings = await db
      .select({
        offering: publisherOfferings,
        relationship: publisherOfferingRelationships,
        publisher: publishers
      })
      .from(publisherOfferings)
      .innerJoin(
        publisherOfferingRelationships,
        eq(publisherOfferings.id, publisherOfferingRelationships.offeringId)
      )
      .innerJoin(publishers, eq(publisherOfferingRelationships.publisherId, publishers.id))
      .where(whereCondition)
      .orderBy(
        asc(publisherOfferingRelationships.priorityRank),
        asc(publisherOfferings.basePrice)
      );

    return offerings;
  }

  /**
   * Get offerings by type for a website
   */
  async getOfferingsByType(websiteId: string, offeringType: keyof typeof OFFERING_TYPES) {
    const offerings = await db
      .select({
        offering: publisherOfferings,
        relationship: publisherOfferingRelationships,
        publisher: publishers
      })
      .from(publisherOfferings)
      .innerJoin(
        publisherOfferingRelationships,
        eq(publisherOfferings.id, publisherOfferingRelationships.offeringId)
      )
      .innerJoin(publishers, eq(publisherOfferingRelationships.publisherId, publishers.id))
      .where(
        and(
          eq(publisherOfferingRelationships.websiteId, websiteId),
          eq(publisherOfferings.offeringType, OFFERING_TYPES[offeringType]),
          eq(publisherOfferings.isActive, true),
          eq(publisherOfferingRelationships.isActive, true)
        )
      )
      .orderBy(asc(publisherOfferings.basePrice));

    return offerings;
  }

  // ============================================================================
  // Pricing Rules
  // ============================================================================

  /**
   * Add a pricing rule to an offering
   */
  async addPricingRule(
    offeringId: string,
    rule: Omit<NewPublisherPricingRule, 'publisherOfferingId'>
  ): Promise<PublisherPricingRule> {
    const [pricingRule] = await db
      .insert(publisherPricingRules)
      .values({
        publisherOfferingId: offeringId,
        ...rule
      })
      .returning();

    return pricingRule;
  }

  /**
   * Get applicable pricing rules for an offering
   */
  async getApplicablePricingRules(offeringId: string, context: Record<string, any> = {}) {
    const rules = await db
      .select()
      .from(publisherPricingRules)
      .where(
        and(
          eq(publisherPricingRules.publisherOfferingId, offeringId),
          eq(publisherPricingRules.isActive, true)
        )
      )
      .orderBy(asc(publisherPricingRules.priority));

    // Filter rules based on context (this would be more complex in production)
    const applicableRules = rules.filter(rule => {
      const conditions = rule.conditions as Record<string, any>;
      
      // Check if context matches conditions
      // This is simplified - real implementation would be more sophisticated
      if (conditions.niches && context.niche) {
        if (!conditions.niches.includes(context.niche)) return false;
      }
      
      if (conditions.minQuantity && context.quantity) {
        if (context.quantity < conditions.minQuantity) return false;
      }
      
      if (conditions.maxQuantity && context.quantity) {
        if (context.quantity > conditions.maxQuantity) return false;
      }
      
      return true;
    });

    return applicableRules;
  }

  /**
   * Calculate final price for an offering with rules applied
   */
  async calculatePrice(offeringId: string, orderContext: Record<string, any> = {}) {
    // Get the offering
    const [offering] = await db
      .select()
      .from(publisherOfferings)
      .where(eq(publisherOfferings.id, offeringId))
      .limit(1);

    if (!offering) {
      throw new Error('Offering not found');
    }

    let finalPrice = Number(offering.basePrice);
    
    // Get applicable rules
    const rules = await this.getApplicablePricingRules(offeringId, orderContext);
    
    // Apply rules in priority order
    for (const rule of rules) {
      const actions = rule.actions as Record<string, any>;
      
      if (actions.priceMultiplier) {
        finalPrice *= actions.priceMultiplier;
      }
      
      if (actions.discountPercent) {
        finalPrice *= (1 - actions.discountPercent / 100);
      }
      
      if (actions.fixedDiscount) {
        finalPrice -= actions.fixedDiscount;
      }
      
      if (actions.addFee) {
        finalPrice += actions.addFee;
      }
      
      if (actions.overridePrice) {
        finalPrice = actions.overridePrice;
      }
      
      // If not cumulative, stop after first rule
      if (!rule.isCumulative) break;
    }
    
    return {
      basePrice: Number(offering.basePrice),
      finalPrice: Math.max(0, finalPrice), // Ensure price doesn't go negative
      appliedRules: rules,
      currency: offering.currency
    };
  }

  // ============================================================================
  // Performance Tracking
  // ============================================================================

  /**
   * Update performance metrics for a publisher-website relationship
   */
  async updatePerformanceMetrics(
    publisherId: string,
    websiteId: string | null,
    metrics: Partial<{
      totalOrders: number;
      successfulOrders: number;
      failedOrders: number;
      avgResponseTimeHours: number;
      avgTurnaroundDays: number;
      onTimeDeliveryRate: number;
      contentApprovalRate: number;
      revisionRate: number;
      clientSatisfactionScore: number;
      totalRevenue: number;
      avgOrderValue: number;
    }>
  ) {
    // Check if performance record exists
    const existing = await db
      .select()
      .from(publisherPerformance)
      .where(
        and(
          eq(publisherPerformance.publisherId, publisherId),
          websiteId ? eq(publisherPerformance.websiteId, websiteId) : sql`${publisherPerformance.websiteId} IS NULL`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      // Convert numeric fields to strings for DECIMAL columns
      const formattedMetrics: any = {};
      for (const [key, value] of Object.entries(metrics)) {
        if (typeof value === 'number' && (key === 'totalRevenue' || key === 'avgOrderValue')) {
          formattedMetrics[key] = value.toString();
        } else {
          formattedMetrics[key] = value;
        }
      }
      
      await db
        .update(publisherPerformance)
        .set({
          ...formattedMetrics,
          lastCalculatedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(publisherPerformance.id, existing[0].id));
    } else {
      // Create new record
      // Convert numeric fields to strings for DECIMAL columns
      const formattedMetrics: any = {};
      for (const [key, value] of Object.entries(metrics)) {
        if (typeof value === 'number' && (key === 'totalRevenue' || key === 'avgOrderValue')) {
          formattedMetrics[key] = value.toString();
        } else {
          formattedMetrics[key] = value;
        }
      }
      
      await db
        .insert(publisherPerformance)
        .values({
          publisherId,
          websiteId,
          ...formattedMetrics,
          lastCalculatedAt: new Date()
        });
    }
  }

  /**
   * Calculate and update reliability score
   */
  async calculateReliabilityScore(publisherId: string, websiteId: string | null = null) {
    const performance = await db
      .select()
      .from(publisherPerformance)
      .where(
        and(
          eq(publisherPerformance.publisherId, publisherId),
          websiteId ? eq(publisherPerformance.websiteId, websiteId) : sql`${publisherPerformance.websiteId} IS NULL`
        )
      )
      .limit(1);

    if (performance.length === 0) return null;

    const perf = performance[0];
    
    // Calculate reliability score based on various metrics
    let score = 0;
    let weightTotal = 0;
    
    // Success rate (weight: 30%)
    if (perf.totalOrders && perf.successfulOrders) {
      const successRate = (perf.successfulOrders / perf.totalOrders) * 100;
      score += successRate * 0.3;
      weightTotal += 0.3;
    }
    
    // On-time delivery (weight: 25%)
    if (perf.onTimeDeliveryRate) {
      score += Number(perf.onTimeDeliveryRate) * 0.25;
      weightTotal += 0.25;
    }
    
    // Content approval rate (weight: 20%)
    if (perf.contentApprovalRate) {
      score += Number(perf.contentApprovalRate) * 0.2;
      weightTotal += 0.2;
    }
    
    // Client satisfaction (weight: 25%)
    if (perf.clientSatisfactionScore) {
      const satisfactionPercent = (Number(perf.clientSatisfactionScore) / 5) * 100;
      score += satisfactionPercent * 0.25;
      weightTotal += 0.25;
    }
    
    // Normalize score if not all metrics are available
    const finalScore = weightTotal > 0 ? score / weightTotal : 0;
    
    // Update the reliability score
    await db
      .update(publisherPerformance)
      .set({
        reliabilityScore: finalScore.toString(),
        lastCalculatedAt: new Date()
      })
      .where(eq(publisherPerformance.id, perf.id));
    
    return finalScore;
  }

  /**
   * Get publisher performance summary
   */
  async getPublisherPerformance(publisherId: string) {
    const performance = await db
      .select({
        performance: publisherPerformance,
        website: websites
      })
      .from(publisherPerformance)
      .leftJoin(websites, eq(publisherPerformance.websiteId, websites.id))
      .where(eq(publisherPerformance.publisherId, publisherId))
      .orderBy(desc(publisherPerformance.reliabilityScore));

    return performance;
  }
}

// Export singleton instance
export const publisherOfferingsService = new PublisherOfferingsService();