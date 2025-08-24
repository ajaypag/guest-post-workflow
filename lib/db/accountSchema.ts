import { pgTable, uuid, varchar, timestamp, boolean, text, index, uniqueIndex, bigint, integer, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clients } from './schema';
import { orders } from './orderSchema';
import { websites } from './websiteSchema';

/**
 * Accounts table - external clients who order guest posts
 * These are NOT internal users - they are customers
 * Previously named "advertisers" - renamed for neutrality
 */
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey(),
  
  // Authentication fields
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('viewer'), // viewer, editor, admin
  
  // Profile information
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 255 }),
  
  // Business information
  taxId: varchar('tax_id', { length: 100 }),
  billingAddress: text('billing_address'),
  billingCity: varchar('billing_city', { length: 100 }),
  billingState: varchar('billing_state', { length: 100 }),
  billingZip: varchar('billing_zip', { length: 20 }),
  billingCountry: varchar('billing_country', { length: 100 }),
  
  // Payment terms
  creditTerms: varchar('credit_terms', { length: 50 }).default('prepay'), // prepay, net15, net30, net60
  creditLimit: bigint('credit_limit', { mode: 'number' }).default(0), // in cents
  
  // Relationship to internal client
  primaryClientId: uuid('primary_client_id').references(() => clients.id),
  
  // Account status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, active, suspended, blocked
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  
  // Password reset
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  
  // Notes and preferences
  internalNotes: text('internal_notes'), // Only visible to internal team
  orderPreferences: text('order_preferences'), // JSON - delivery preferences, content guidelines
  
  // Onboarding tracking
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingSteps: text('onboarding_steps').default('{}'), // JSON tracking individual steps
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
  
  // AI Feature Permissions
  aiPermissions: text('ai_permissions').default('{}'), // JSON object with specific permissions
  canUseAiKeywords: boolean('can_use_ai_keywords').default(false),
  canUseAiDescriptions: boolean('can_use_ai_descriptions').default(false),
  canUseAiContentGeneration: boolean('can_use_ai_content_generation').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
  emailIdx: uniqueIndex('idx_accounts_email').on(table.email),
  statusIdx: index('idx_accounts_status').on(table.status),
  clientIdx: index('idx_accounts_client').on(table.primaryClientId),
  onboardingIdx: index('idx_accounts_onboarding').on(table.onboardingCompleted),
}));

// Relations
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  primaryClient: one(clients, {
    fields: [accounts.primaryClientId],
    references: [clients.id],
  }),
  orders: many(orders),
}));

/**
 * Publishers table - external website owners who provide guest post opportunities
 * These are NOT internal users - they are suppliers
 */
export const publishers = pgTable('publishers', {
  id: uuid('id').primaryKey(),
  
  // Authentication fields
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }), // Nullable for shadow publishers
  
  // Profile information
  contactName: varchar('contact_name', { length: 255 }).notNull().default('Unknown'),
  companyName: varchar('company_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  
  // Business information
  taxId: varchar('tax_id', { length: 100 }),
  paymentEmail: varchar('payment_email', { length: 255 }), // For PayPal, etc
  paymentMethod: varchar('payment_method', { length: 50 }).default('paypal'), // paypal, wire, check
  
  // Banking info (encrypted)
  bankName: varchar('bank_name', { length: 255 }),
  bankAccountNumber: varchar('bank_account_number', { length: 255 }), // encrypted
  bankRoutingNumber: varchar('bank_routing_number', { length: 255 }), // encrypted
  
  // Commission settings
  commissionRate: integer('commission_rate').default(40), // percentage (e.g., 40 = 40%)
  minimumPayout: bigint('minimum_payout', { mode: 'number' }).default(10000), // in cents ($100)
  
  // Account status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, active, suspended, blocked
  accountStatus: varchar('account_status', { length: 50 }).default('unclaimed'), // unclaimed, shadow, active, system, suspended, blocked
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  
  // Shadow publisher fields
  source: varchar('source', { length: 50 }).default('manual'), // manual, manyreach, import, api
  sourceMetadata: text('source_metadata').default('{}'), // JSON metadata
  claimedAt: timestamp('claimed_at'),
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }), // DECIMAL(3,2) for 0.00 to 1.00
  
  // Invitation fields
  invitationToken: varchar('invitation_token', { length: 255 }),
  invitationSentAt: timestamp('invitation_sent_at'),
  invitationExpiresAt: timestamp('invitation_expires_at'),
  
  // Claim verification
  claimVerificationCode: varchar('claim_verification_code', { length: 6 }),
  claimAttempts: integer('claim_attempts').default(0),
  lastClaimAttempt: timestamp('last_claim_attempt'),
  
  // Password reset
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  
  // Content guidelines
  contentGuidelines: text('content_guidelines'),
  prohibitedTopics: text('prohibited_topics'), // JSON array
  turnaroundTime: integer('turnaround_time').default(7), // days
  
  // Notes
  internalNotes: text('internal_notes'), // Only visible to internal team
  
  // Shadow data migration tracking
  shadowDataMigrated: boolean('shadow_data_migrated').default(false),
  shadowMigrationCompletedAt: timestamp('shadow_migration_completed_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
  emailIdx: uniqueIndex('idx_publishers_email').on(table.email),
  statusIdx: index('idx_publishers_status').on(table.status),
  accountStatusIdx: index('idx_publishers_account_status').on(table.accountStatus),
  sourceIdx: index('idx_publishers_source').on(table.source),
  invitationTokenIdx: index('idx_publishers_invitation_token').on(table.invitationToken),
}));

// Link table for publishers to manage multiple websites
export const publisherWebsites = pgTable('publisher_websites', {
  id: uuid('id').primaryKey(),
  publisherId: uuid('publisher_id').notNull().references(() => publishers.id, { onDelete: 'cascade' }),
  websiteId: uuid('website_id').notNull(), // references websites table
  
  // Permissions
  canEditPricing: boolean('can_edit_pricing').default(true),
  canEditAvailability: boolean('can_edit_availability').default(true),
  canViewAnalytics: boolean('can_view_analytics').default(true),
  
  // Status
  status: varchar('status', { length: 20 }).default('active'), // active, paused, removed
  
  // Timestamps
  addedAt: timestamp('added_at').notNull().defaultNow(),
  removedAt: timestamp('removed_at'),
}, (table) => ({
  publisherIdx: index('idx_publisher_websites_publisher').on(table.publisherId),
  websiteIdx: index('idx_publisher_websites_website').on(table.websiteId),
  uniqueCombo: uniqueIndex('idx_publisher_website_unique').on(table.publisherId, table.websiteId),
}));

// Type exports
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Publisher = typeof publishers.$inferSelect;
export type NewPublisher = typeof publishers.$inferInsert;
export type PublisherWebsite = typeof publisherWebsites.$inferSelect;
export type NewPublisherWebsite = typeof publisherWebsites.$inferInsert;

// Relations
export const publishersRelations = relations(publishers, ({ many }) => ({
  websites: many(publisherWebsites),
  // Note: Legacy publisher table - new publisher CRM uses publisherContacts
}));

export const publisherWebsitesRelations = relations(publisherWebsites, ({ one }) => ({
  publisher: one(publishers, {
    fields: [publisherWebsites.publisherId],
    references: [publishers.id],
  }),
  website: one(websites, {
    fields: [publisherWebsites.websiteId],
    references: [websites.id],
  }),
}));