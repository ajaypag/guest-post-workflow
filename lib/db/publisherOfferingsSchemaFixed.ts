import { pgTable, uuid, varchar, timestamp, boolean, text, integer, decimal, date, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { publishers } from './accountSchema';
import { websites } from './websiteSchema';

/**
 * Publisher Offerings Schema - Fixed Integration Version
 * 
 * This schema creates an enhancement layer on top of the existing websites table
 * rather than replacing it. During the transition period, the websites table
 * remains the source of truth while we gradually migrate to this new structure.
 * 
 * Integration Strategy:
 * - Phase 1: Add publisher offerings as supplementary data
 * - Phase 2: Dual-write to both old and new fields
 * - Phase 3: Deprecate old fields and complete migration
 */

// ============================================================================
// Publisher Offering Relationships
// Links publishers to websites (renamed from publisher_websites to avoid conflict)
// ============================================================================

export const publisherOfferingRelationships = pgTable('publisher_offering_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').notNull().references(() => publishers.id, { onDelete: 'cascade' }),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  
  // Relationship Details
  relationshipType: varchar('relationship_type', { length: 50 }).notNull().default('contact'),
  verificationStatus: varchar('verification_status', { length: 20 }).notNull().default('claimed'),
  verificationMethod: varchar('verification_method', { length: 50 }),
  verifiedAt: timestamp('verified_at'),
  
  // Priority and Status
  priorityRank: integer('priority_rank').default(100),
  isActive: boolean('is_active').default(true),
  isPreferred: boolean('is_preferred').default(false),
  
  // Contact Information (supplements websites table)
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  contactName: varchar('contact_name', { length: 255 }),
  
  // Notes
  internalNotes: text('internal_notes'),
  publisherNotes: text('publisher_notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Indexes
  publisherIdx: index('idx_publisher_offering_rel_publisher').on(table.publisherId),
  websiteIdx: index('idx_publisher_offering_rel_website').on(table.websiteId),
  activeIdx: index('idx_publisher_offering_rel_active').on(table.isActive),
  verificationIdx: index('idx_publisher_offering_rel_verification').on(table.verificationStatus),
  priorityIdx: index('idx_publisher_offering_rel_priority').on(table.websiteId, table.priorityRank),
  // Unique constraint
  uniquePublisherWebsite: uniqueIndex('publisher_website_offering_unique').on(table.publisherId, table.websiteId),
}));

// ============================================================================
// Publisher Offerings (Product Catalog)
// Supplements websites.guestPostCost with complex pricing
// ============================================================================

export const publisherOfferings = pgTable('publisher_offerings', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherRelationshipId: uuid('publisher_relationship_id').notNull()
    .references(() => publisherOfferingRelationships.id, { onDelete: 'cascade' }),
  
  // Offering Details
  offeringType: varchar('offering_type', { length: 50 }).notNull(),
  offeringName: varchar('offering_name', { length: 255 }),
  
  // Pricing (supplements websites.guestPostCost)
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  priceType: varchar('price_type', { length: 20 }).default('fixed'),
  
  // Delivery Specifications
  turnaroundDays: integer('turnaround_days').default(7),
  expressAvailable: boolean('express_available').default(false),
  expressDays: integer('express_days'),
  expressPrice: decimal('express_price', { precision: 10, scale: 2 }),
  
  // Link Specifications
  linkType: varchar('link_type', { length: 20 }).default('dofollow'),
  linkDuration: varchar('link_duration', { length: 20 }).default('permanent'),
  maxLinksPerPost: integer('max_links_per_post').default(1),
  
  // Flexible Attributes (JSONB)
  attributes: jsonb('attributes').default({}),
  
  // Availability
  monthlyCapacity: integer('monthly_capacity'),
  currentAvailability: varchar('current_availability', { length: 20 }).default('available'),
  nextAvailableDate: date('next_available_date'),
  
  // Status
  isActive: boolean('is_active').default(true),
  isFeatured: boolean('is_featured').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastOrderAt: timestamp('last_order_at'),
}, (table) => ({
  // Indexes
  relationshipIdx: index('idx_publisher_offerings_relationship').on(table.publisherRelationshipId),
  typeIdx: index('idx_publisher_offerings_type').on(table.offeringType),
  activeIdx: index('idx_publisher_offerings_active').on(table.isActive),
  availabilityIdx: index('idx_publisher_offerings_availability').on(table.currentAvailability),
  priceIdx: index('idx_publisher_offerings_price').on(table.basePrice),
  // Unique constraint
  uniqueOffering: uniqueIndex('offering_unique').on(
    table.publisherRelationshipId, 
    table.offeringType, 
    table.offeringName
  ),
}));

// ============================================================================
// Publisher Pricing Rules
// Complex pricing (renamed from pricing_rules to avoid conflict)
// ============================================================================

export const publisherPricingRules = pgTable('publisher_pricing_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherOfferingId: uuid('publisher_offering_id').notNull()
    .references(() => publisherOfferings.id, { onDelete: 'cascade' }),
  
  // Rule Identification
  ruleType: varchar('rule_type', { length: 50 }).notNull(),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Rule Logic (JSONB)
  conditions: jsonb('conditions').notNull().default({}),
  actions: jsonb('actions').notNull().default({}),
  
  // Rule Priority and Application
  priority: integer('priority').default(100),
  isCumulative: boolean('is_cumulative').default(false),
  autoApply: boolean('auto_apply').default(true),
  requiresApproval: boolean('requires_approval').default(false),
  
  // Validity Period
  validFrom: date('valid_from'),
  validUntil: date('valid_until'),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Indexes
  offeringIdx: index('idx_publisher_pricing_rules_offering').on(table.publisherOfferingId),
  typeIdx: index('idx_publisher_pricing_rules_type').on(table.ruleType),
  activeIdx: index('idx_publisher_pricing_rules_active').on(table.isActive),
  priorityIdx: index('idx_publisher_pricing_rules_priority').on(table.priority),
}));

// ============================================================================
// Publisher Performance Tracking
// Supplements websites table metrics during transition
// ============================================================================

export const publisherPerformance = pgTable('publisher_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').notNull().references(() => publishers.id, { onDelete: 'cascade' }),
  websiteId: uuid('website_id').references(() => websites.id, { onDelete: 'cascade' }),
  
  // Performance Metrics (will replace websites metrics)
  totalOrders: integer('total_orders').default(0),
  successfulOrders: integer('successful_orders').default(0),
  failedOrders: integer('failed_orders').default(0),
  
  // Response Metrics
  avgResponseTimeHours: decimal('avg_response_time_hours', { precision: 10, scale: 2 }),
  avgTurnaroundDays: decimal('avg_turnaround_days', { precision: 10, scale: 2 }),
  onTimeDeliveryRate: decimal('on_time_delivery_rate', { precision: 5, scale: 2 }),
  
  // Quality Metrics
  contentApprovalRate: decimal('content_approval_rate', { precision: 5, scale: 2 }),
  revisionRate: decimal('revision_rate', { precision: 5, scale: 2 }),
  clientSatisfactionScore: decimal('client_satisfaction_score', { precision: 3, scale: 2 }),
  
  // Financial Metrics
  totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).default('0'),
  avgOrderValue: decimal('avg_order_value', { precision: 10, scale: 2 }),
  
  // Reliability Score
  reliabilityScore: decimal('reliability_score', { precision: 5, scale: 2 }),
  lastCalculatedAt: timestamp('last_calculated_at'),
  
  // Period
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Indexes
  publisherIdx: index('idx_publisher_performance_publisher').on(table.publisherId),
  websiteIdx: index('idx_publisher_performance_website').on(table.websiteId),
  reliabilityIdx: index('idx_publisher_performance_reliability').on(table.reliabilityScore),
  // Unique constraint
  uniquePerformance: uniqueIndex('performance_unique').on(table.publisherId, table.websiteId),
}));

// ============================================================================
// Publisher Email Claim Mapping
// ============================================================================

export const publisherEmailClaims = pgTable('publisher_email_claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').references(() => publishers.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  websiteId: uuid('website_id').references(() => websites.id, { onDelete: 'cascade' }),
  
  // Claim Details
  claimStatus: varchar('claim_status', { length: 20 }).default('pending'),
  claimConfidence: varchar('claim_confidence', { length: 20 }).default('low'),
  claimSource: varchar('claim_source', { length: 50 }),
  
  // Verification
  verificationToken: varchar('verification_token', { length: 255 }),
  verificationSentAt: timestamp('verification_sent_at'),
  verifiedAt: timestamp('verified_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  // Indexes
  publisherIdx: index('idx_publisher_email_claims_publisher').on(table.publisherId),
  emailIdx: index('idx_publisher_email_claims_email').on(table.email),
  websiteIdx: index('idx_publisher_email_claims_website').on(table.websiteId),
  statusIdx: index('idx_publisher_email_claims_status').on(table.claimStatus),
  // Unique constraint
  uniqueClaim: uniqueIndex('claim_unique').on(table.publisherId, table.email, table.websiteId),
}));

// ============================================================================
// Relations
// ============================================================================

export const publisherOfferingRelationshipsRelations = relations(
  publisherOfferingRelationships, 
  ({ one, many }) => ({
    publisher: one(publishers, {
      fields: [publisherOfferingRelationships.publisherId],
      references: [publishers.id],
    }),
    website: one(websites, {
      fields: [publisherOfferingRelationships.websiteId],
      references: [websites.id],
    }),
    offerings: many(publisherOfferings),
  })
);

export const publisherOfferingsRelations = relations(publisherOfferings, ({ one, many }) => ({
  relationship: one(publisherOfferingRelationships, {
    fields: [publisherOfferings.publisherRelationshipId],
    references: [publisherOfferingRelationships.id],
  }),
  pricingRules: many(publisherPricingRules),
}));

export const publisherPricingRulesRelations = relations(publisherPricingRules, ({ one }) => ({
  offering: one(publisherOfferings, {
    fields: [publisherPricingRules.publisherOfferingId],
    references: [publisherOfferings.id],
  }),
}));

export const publisherPerformanceRelations = relations(publisherPerformance, ({ one }) => ({
  publisher: one(publishers, {
    fields: [publisherPerformance.publisherId],
    references: [publishers.id],
  }),
  website: one(websites, {
    fields: [publisherPerformance.websiteId],
    references: [websites.id],
  }),
}));

export const publisherEmailClaimsRelations = relations(publisherEmailClaims, ({ one }) => ({
  publisher: one(publishers, {
    fields: [publisherEmailClaims.publisherId],
    references: [publishers.id],
  }),
  website: one(websites, {
    fields: [publisherEmailClaims.websiteId],
    references: [websites.id],
  }),
}));

// ============================================================================
// Type Exports
// ============================================================================

export type PublisherOfferingRelationship = typeof publisherOfferingRelationships.$inferSelect;
export type NewPublisherOfferingRelationship = typeof publisherOfferingRelationships.$inferInsert;

export type PublisherOffering = typeof publisherOfferings.$inferSelect;
export type NewPublisherOffering = typeof publisherOfferings.$inferInsert;

export type PublisherPricingRule = typeof publisherPricingRules.$inferSelect;
export type NewPublisherPricingRule = typeof publisherPricingRules.$inferInsert;

export type PublisherPerformance = typeof publisherPerformance.$inferSelect;
export type NewPublisherPerformance = typeof publisherPerformance.$inferInsert;

export type PublisherEmailClaim = typeof publisherEmailClaims.$inferSelect;
export type NewPublisherEmailClaim = typeof publisherEmailClaims.$inferInsert;

// ============================================================================
// Enums and Constants
// ============================================================================

export const OFFERING_TYPES = {
  GUEST_POST: 'guest_post',
  LINK_INSERTION: 'link_insertion',
  HOMEPAGE_LINK: 'homepage_link',
  BANNER_AD: 'banner_ad',
  PRESS_RELEASE: 'press_release',
  SPONSORED_POST: 'sponsored_post',
  NICHE_EDIT: 'niche_edit',
} as const;

export const RELATIONSHIP_TYPES = {
  OWNER: 'owner',
  EDITOR: 'editor',
  MANAGER: 'manager',
  BROKER: 'broker',
  CONTACT: 'contact',
} as const;

export const VERIFICATION_STATUS = {
  VERIFIED: 'verified',
  CLAIMED: 'claimed',
  PENDING: 'pending',
  DISPUTED: 'disputed',
} as const;

export const LINK_TYPES = {
  DOFOLLOW: 'dofollow',
  NOFOLLOW: 'nofollow',
  BOTH: 'both',
  SPONSORED: 'sponsored',
} as const;

export const AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  LIMITED: 'limited',
  BOOKED: 'booked',
  PAUSED: 'paused',
} as const;

// ============================================================================
// Helper Types for Application Layer
// ============================================================================

/**
 * Offering attributes structure (enforced at application layer)
 */
export interface OfferingAttributes {
  wordCount?: {
    min: number;
    max: number;
  };
  allowsAiContent?: boolean;
  allowsPromotional?: boolean;
  disclosureType?: 'none' | 'sponsored' | 'rel_sponsored' | 'disclaimer';
  includesImages?: boolean;
  includesSocialShares?: boolean;
  writer?: 'publisher_provides' | 'client_provides' | 'either';
  contentApprovalRequired?: boolean;
  allowsRevisions?: number;
  allowsGrayNiches?: boolean;
  prohibitedNiches?: string[];
  anchorTextRules?: string;
  geographicRestrictions?: string[];
  language?: string;
}

/**
 * Pricing rule conditions structure
 */
export interface PricingConditions {
  niches?: string[];
  minQuantity?: number;
  maxQuantity?: number;
  clientType?: string[];
  orderUrgency?: 'standard' | 'express' | 'rush';
  dateRange?: {
    start: string;
    end: string;
  };
  totalSpend?: {
    min?: number;
    max?: number;
  };
}

/**
 * Pricing rule actions structure
 */
export interface PricingActions {
  priceMultiplier?: number;
  discountPercent?: number;
  fixedDiscount?: number;
  addFee?: number;
  overridePrice?: number;
  bonusLinks?: number;
}