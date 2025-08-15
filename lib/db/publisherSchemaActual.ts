/**
 * Publisher Schema - Matches Actual Database Structure
 * This file matches the actual migration that was applied to the database
 */

import { pgTable, uuid, varchar, timestamp, boolean, text, integer, jsonb, decimal, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { publishers } from './accountSchema';
import { websites } from './websiteSchema';

// Publisher Offerings - Direct publisher_id relationship (matches actual DB)
export const publisherOfferings = pgTable('publisher_offerings', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').notNull(), // Direct reference to publisher
  offeringType: varchar('offering_type', { length: 50 }).notNull(),
  basePrice: integer('base_price').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  turnaroundDays: integer('turnaround_days'),
  currentAvailability: varchar('current_availability', { length: 50 }).notNull().default('available'),
  expressAvailable: boolean('express_available').default(false),
  expressPrice: integer('express_price'),
  expressDays: integer('express_days'),
  minWordCount: integer('min_word_count'),
  maxWordCount: integer('max_word_count'),
  niches: text('niches').array(),
  languages: varchar('languages', { length: 10 }).array().default(['en']),
  attributes: jsonb('attributes').default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Publisher Offering Relationships - Links publishers to websites through offerings
export const publisherOfferingRelationships = pgTable('publisher_offering_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').notNull(),
  offeringId: uuid('offering_id'),  // Nullable - relationships can exist before offerings
  websiteId: uuid('website_id').notNull(),
  isPrimary: boolean('is_primary').default(false),
  isActive: boolean('is_active').default(true),
  customTerms: jsonb('custom_terms').default({}),
  relationshipType: varchar('relationship_type', { length: 50 }).notNull().default('contact'),
  verificationStatus: varchar('verification_status', { length: 20 }).notNull().default('claimed'),
  verificationMethod: varchar('verification_method', { length: 50 }),
  priorityRank: integer('priority_rank').default(100),
  isPreferred: boolean('is_preferred').default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: uuid('verified_by'),
  // Contact Information
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  contactName: varchar('contact_name', { length: 255 }),
  // Notes
  internalNotes: text('internal_notes'),
  publisherNotes: text('publisher_notes'),
  // Commission/Payment terms
  commissionRate: varchar('commission_rate', { length: 50 }),
  paymentTerms: varchar('payment_terms', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Publisher Pricing Rules
export const publisherPricingRules = pgTable('publisher_pricing_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherOfferingId: uuid('publisher_offering_id').notNull(),
  ruleType: varchar('rule_type', { length: 50 }).notNull(),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  description: text('description'),
  conditions: jsonb('conditions').notNull(),
  actions: jsonb('actions').notNull(),
  priority: integer('priority').default(0),
  isCumulative: boolean('is_cumulative').default(false),
  autoApply: boolean('auto_apply').default(true),
  requiresApproval: boolean('requires_approval').default(false),
  validFrom: timestamp('valid_from'),
  validUntil: timestamp('valid_until'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Publisher Performance (matches actual DB structure)
export const publisherPerformance = pgTable('publisher_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').notNull(),
  websiteId: uuid('website_id'),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  totalOrders: integer('total_orders').default(0),
  successfulOrders: integer('successful_orders').default(0),
  failedOrders: integer('failed_orders').default(0),
  avgResponseTimeHours: decimal('avg_response_time_hours', { precision: 10, scale: 2 }),
  avgTurnaroundDays: decimal('avg_turnaround_days', { precision: 10, scale: 2 }),
  onTimeDeliveryRate: decimal('on_time_delivery_rate', { precision: 5, scale: 2 }),
  clientSatisfactionScore: decimal('client_satisfaction_score', { precision: 3, scale: 2 }),
  contentApprovalRate: decimal('content_approval_rate', { precision: 5, scale: 2 }).default('0'),
  revisionRate: decimal('revision_rate', { precision: 5, scale: 2 }).default('0'),
  revenueGenerated: integer('revenue_generated').default(0),
  totalRevenue: integer('total_revenue').default(0),
  avgOrderValue: integer('avg_order_value').default(0),
  commissionEarned: integer('commission_earned').default(0),
  reliabilityScore: decimal('reliability_score', { precision: 3, scale: 2 }),
  lastCalculatedAt: timestamp('last_calculated_at').defaultNow(),
  metrics: jsonb('metrics').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const publisherOfferingsRelations = relations(publisherOfferings, ({ one, many }) => ({
  publisher: one(publishers, {
    fields: [publisherOfferings.publisherId],
    references: [publishers.id],
  }),
  relationships: many(publisherOfferingRelationships),
}));

export const publisherOfferingRelationshipsRelations = relations(
  publisherOfferingRelationships,
  ({ one }) => ({
    publisher: one(publishers, {
      fields: [publisherOfferingRelationships.publisherId],
      references: [publishers.id],
    }),
    offering: one(publisherOfferings, {
      fields: [publisherOfferingRelationships.offeringId],
      references: [publisherOfferings.id],
    }),
    website: one(websites, {
      fields: [publisherOfferingRelationships.websiteId],
      references: [websites.id],
    }),
  })
);

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

// Constants
export const OFFERING_TYPES = {
  GUEST_POST: 'guest_post',
  LINK_INSERTION: 'link_insertion',
  HOMEPAGE_LINK: 'homepage_link',
  BANNER_AD: 'banner_ad',
  PRESS_RELEASE: 'press_release',
  SPONSORED_POST: 'sponsored_post',
  NICHE_EDIT: 'niche_edit',
} as const;

// Type exports
export type PublisherOffering = typeof publisherOfferings.$inferSelect;
export type NewPublisherOffering = typeof publisherOfferings.$inferInsert;

export type PublisherOfferingRelationship = typeof publisherOfferingRelationships.$inferSelect;
export type NewPublisherOfferingRelationship = typeof publisherOfferingRelationships.$inferInsert;

export type PublisherPricingRule = typeof publisherPricingRules.$inferSelect;
export type NewPublisherPricingRule = typeof publisherPricingRules.$inferInsert;

export type PublisherPerformance = typeof publisherPerformance.$inferSelect;
export type NewPublisherPerformance = typeof publisherPerformance.$inferInsert;