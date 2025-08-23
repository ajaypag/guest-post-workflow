import { pgTable, uuid, varchar, timestamp, boolean, text, index, uniqueIndex, integer, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { publishers } from './accountSchema';
import { users } from './schema';
import { websites } from './websiteSchema';

/**
 * Email processing logs for ManyReach webhooks
 * Stores all incoming email responses from publishers
 */
export const emailProcessingLogs = pgTable('email_processing_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Webhook identification
  webhookId: varchar('webhook_id', { length: 255 }),
  campaignId: varchar('campaign_id', { length: 255 }),
  campaignName: varchar('campaign_name', { length: 255 }),
  campaignType: varchar('campaign_type', { length: 50 }), // outreach, follow_up, bulk
  
  // Email metadata
  emailFrom: varchar('email_from', { length: 255 }).notNull(),
  emailTo: varchar('email_to', { length: 255 }),
  emailSubject: varchar('email_subject', { length: 500 }),
  emailMessageId: varchar('email_message_id', { length: 255 }),
  receivedAt: timestamp('received_at'),
  
  // Content
  rawContent: text('raw_content').notNull(),
  htmlContent: text('html_content'),
  
  // AI parsing results
  parsedData: text('parsed_data').default('{}'), // JSONB in DB
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }), // DECIMAL(3,2) for 0.00 to 1.00
  parsingErrors: text('parsing_errors'), // TEXT[] in DB - store as JSON
  
  // Processing status
  status: varchar('status', { length: 50 }).default('pending'), // pending, processing, parsed, failed, reviewed, retrying
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at'),
  processingDurationMs: integer('processing_duration_ms'),
  
  // Qualification tracking (added by migration 0058)
  qualificationStatus: varchar('qualification_status', { length: 50 }).default('pending'), // pending, qualified, disqualified, legacy_processed
  disqualificationReason: varchar('disqualification_reason', { length: 100 }),
  
  // Thread tracking
  threadId: varchar('thread_id', { length: 255 }),
  replyCount: integer('reply_count').default(0),
  isAutoReply: boolean('is_auto_reply').default(false),
  originalOutreachId: uuid('original_outreach_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  webhookIdIdx: index('idx_email_logs_webhook_id').on(table.webhookId),
  campaignIdIdx: index('idx_email_logs_campaign_id').on(table.campaignId),
  statusIdx: index('idx_email_logs_status').on(table.status),
  emailFromIdx: index('idx_email_logs_email_from').on(table.emailFrom),
  threadIdIdx: index('idx_email_logs_thread_id').on(table.threadId),
  createdAtIdx: index('idx_email_logs_created_at').on(table.createdAt),
}));

/**
 * Email review queue for manual processing
 * Queue for emails that need human intervention
 */
export const emailReviewQueue = pgTable('email_review_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  logId: uuid('log_id').notNull().references(() => emailProcessingLogs.id, { onDelete: 'cascade' }),
  publisherId: uuid('publisher_id').references(() => publishers.id, { onDelete: 'set null' }),
  
  // Queue management
  priority: integer('priority').default(50), // 0-100, higher = more urgent
  status: varchar('status', { length: 50 }).default('pending'), // pending, in_review, approved, rejected, auto_approved
  queueReason: varchar('queue_reason', { length: 100 }), // low_confidence, missing_data, validation_error, manual_request
  
  // Review data
  suggestedActions: text('suggested_actions').default('{}'), // JSONB in DB
  missingFields: text('missing_fields'), // TEXT[] in DB - store as JSON
  reviewNotes: text('review_notes'),
  correctionsMade: text('corrections_made').default('{}'), // JSONB in DB
  
  // Assignment tracking
  assignedTo: uuid('assigned_to').references(() => users.id),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  autoApproveAt: timestamp('auto_approve_at'), // For automatic approval after delay
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  statusIdx: index('idx_review_queue_status').on(table.status),
  priorityIdx: index('idx_review_queue_priority').on(table.priority),
  assignedIdx: index('idx_review_queue_assigned').on(table.assignedTo),
  autoApproveIdx: index('idx_review_queue_auto_approve').on(table.autoApproveAt),
}));

/**
 * Publisher automation tracking
 * Audit trail of all automated publisher creation and updates
 */
export const publisherAutomationLogs = pgTable('publisher_automation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  emailLogId: uuid('email_log_id').references(() => emailProcessingLogs.id),
  publisherId: uuid('publisher_id').references(() => publishers.id),
  
  // Action tracking
  action: varchar('action', { length: 100 }).notNull(), // created, updated, matched, claimed, status_change
  actionStatus: varchar('action_status', { length: 50 }).default('success'), // success, failed, partial
  
  // Data changes
  previousData: text('previous_data'), // JSONB in DB
  newData: text('new_data'), // JSONB in DB
  fieldsUpdated: text('fields_updated'), // TEXT[] in DB - store as JSON
  
  // Confidence and metadata
  confidence: decimal('confidence', { precision: 3, scale: 2 }), // DECIMAL(3,2) for 0.00 to 1.00
  matchMethod: varchar('match_method', { length: 50 }), // email_exact, domain_match, fuzzy_name, manual
  metadata: text('metadata').default('{}'), // JSONB in DB
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  publisherIdx: index('idx_automation_logs_publisher').on(table.publisherId),
  emailIdx: index('idx_automation_logs_email').on(table.emailLogId),
  actionIdx: index('idx_automation_logs_action').on(table.action),
  createdIdx: index('idx_automation_logs_created').on(table.createdAt),
}));

/**
 * Publisher claim history tracking
 * Security audit trail for publisher account claiming
 */
export const publisherClaimHistory = pgTable('publisher_claim_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  publisherId: uuid('publisher_id').notNull().references(() => publishers.id),
  
  // Claim details
  action: varchar('action', { length: 50 }).notNull(), // initiate_claim, verify_email, set_password, complete_claim, fail_claim
  success: boolean('success').default(true),
  failureReason: varchar('failure_reason', { length: 255 }),
  
  // Security tracking
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  verificationMethod: varchar('verification_method', { length: 50 }), // email_code, token, manual
  
  // Additional data
  metadata: text('metadata').default('{}'), // JSONB in DB
  
  // Timestamp
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  publisherIdx: index('idx_claim_history_publisher').on(table.publisherId),
  actionIdx: index('idx_claim_history_action').on(table.action),
  createdIdx: index('idx_claim_history_created').on(table.createdAt),
}));

/**
 * Shadow publisher website relationships
 * Tracks website associations for unclaimed publishers
 */
export const shadowPublisherWebsites = pgTable('shadow_publisher_websites', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  publisherId: uuid('publisher_id').notNull().references(() => publishers.id),
  websiteId: uuid('website_id').notNull().references(() => websites.id),
  
  // Confidence and source
  confidence: decimal('confidence', { precision: 3, scale: 2 }), // DECIMAL(3,2) for 0.00 to 1.00
  source: varchar('source', { length: 50 }), // email_domain, claimed_in_email, manual, inferred
  extractionMethod: varchar('extraction_method', { length: 100 }), // ai_extracted, regex_match, manual_entry
  
  // Verification status
  verified: boolean('verified').default(false),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  
  // Migration tracking (for shadow -> active publisher migration)
  migrationStatus: varchar('migration_status', { length: 20 }).default('pending'), // pending, migrating, migrated, failed, skipped
  migratedAt: timestamp('migrated_at'),
  migrationNotes: text('migration_notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  publisherIdx: index('idx_shadow_websites_publisher').on(table.publisherId),
  websiteIdx: index('idx_shadow_websites_website').on(table.websiteId),
  verifiedIdx: index('idx_shadow_websites_verified').on(table.verified),
  uniqueCombo: uniqueIndex('unique_shadow_publisher_website').on(table.publisherId, table.websiteId),
}));

/**
 * Follow-up email tracking
 * Tracks automated follow-up emails for missing information
 */
export const emailFollowUps = pgTable('email_follow_ups', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  originalLogId: uuid('original_log_id').references(() => emailProcessingLogs.id),
  publisherId: uuid('publisher_id').references(() => publishers.id),
  
  // Follow-up details
  followUpType: varchar('follow_up_type', { length: 50 }), // missing_pricing, missing_website, missing_requirements, clarification
  followUpNumber: integer('follow_up_number').default(1),
  templateUsed: varchar('template_used', { length: 100 }),
  
  // Email content
  sentTo: varchar('sent_to', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  content: text('content'),
  
  // Missing data tracking
  missingFields: text('missing_fields'), // TEXT[] in DB - store as JSON
  requestedData: text('requested_data').default('{}'), // JSONB in DB
  
  // Response tracking
  sentAt: timestamp('sent_at').defaultNow(),
  responseReceivedAt: timestamp('response_received_at'),
  responseLogId: uuid('response_log_id').references(() => emailProcessingLogs.id),
  
  // Status
  status: varchar('status', { length: 50 }).default('sent'), // sent, bounced, responded, timeout
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  originalIdx: index('idx_follow_ups_original').on(table.originalLogId),
  publisherIdx: index('idx_follow_ups_publisher').on(table.publisherId),
  statusIdx: index('idx_follow_ups_status').on(table.status),
}));

/**
 * ManyReach webhook security tracking
 * Security audit trail for webhook validation
 */
export const webhookSecurityLogs = pgTable('webhook_security_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Request details
  webhookId: varchar('webhook_id', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Security validation
  signatureValid: boolean('signature_valid'),
  signatureProvided: varchar('signature_provided', { length: 500 }),
  timestampValid: boolean('timestamp_valid'),
  ipAllowed: boolean('ip_allowed'),
  
  // Rate limiting
  rateLimitKey: varchar('rate_limit_key', { length: 255 }),
  requestsInWindow: integer('requests_in_window'),
  
  // Result
  allowed: boolean('allowed'),
  rejectionReason: varchar('rejection_reason', { length: 255 }),
  
  // Timestamp
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  createdIdx: index('idx_webhook_security_created').on(table.createdAt),
  ipIdx: index('idx_webhook_security_ip').on(table.ipAddress),
}));

// Type exports
export type EmailProcessingLog = typeof emailProcessingLogs.$inferSelect;
export type NewEmailProcessingLog = typeof emailProcessingLogs.$inferInsert;
export type EmailReviewQueueItem = typeof emailReviewQueue.$inferSelect;
export type NewEmailReviewQueueItem = typeof emailReviewQueue.$inferInsert;
export type PublisherAutomationLog = typeof publisherAutomationLogs.$inferSelect;
export type NewPublisherAutomationLog = typeof publisherAutomationLogs.$inferInsert;
export type PublisherClaimHistoryItem = typeof publisherClaimHistory.$inferSelect;
export type NewPublisherClaimHistoryItem = typeof publisherClaimHistory.$inferInsert;
export type ShadowPublisherWebsite = typeof shadowPublisherWebsites.$inferSelect;
export type NewShadowPublisherWebsite = typeof shadowPublisherWebsites.$inferInsert;
export type EmailFollowUp = typeof emailFollowUps.$inferSelect;
export type NewEmailFollowUp = typeof emailFollowUps.$inferInsert;
export type WebhookSecurityLog = typeof webhookSecurityLogs.$inferSelect;
export type NewWebhookSecurityLog = typeof webhookSecurityLogs.$inferInsert;

// Relations
export const emailProcessingLogsRelations = relations(emailProcessingLogs, ({ one, many }) => ({
  reviewQueue: one(emailReviewQueue, {
    fields: [emailProcessingLogs.id],
    references: [emailReviewQueue.logId],
  }),
  automationLogs: many(publisherAutomationLogs),
  followUps: many(emailFollowUps),
  originalOutreach: one(emailProcessingLogs, {
    fields: [emailProcessingLogs.originalOutreachId],
    references: [emailProcessingLogs.id],
  }),
}));

export const emailReviewQueueRelations = relations(emailReviewQueue, ({ one }) => ({
  log: one(emailProcessingLogs, {
    fields: [emailReviewQueue.logId],
    references: [emailProcessingLogs.id],
  }),
  publisher: one(publishers, {
    fields: [emailReviewQueue.publisherId],
    references: [publishers.id],
  }),
  assignedUser: one(users, {
    fields: [emailReviewQueue.assignedTo],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [emailReviewQueue.reviewedBy],
    references: [users.id],
  }),
}));

export const publisherAutomationLogsRelations = relations(publisherAutomationLogs, ({ one }) => ({
  emailLog: one(emailProcessingLogs, {
    fields: [publisherAutomationLogs.emailLogId],
    references: [emailProcessingLogs.id],
  }),
  publisher: one(publishers, {
    fields: [publisherAutomationLogs.publisherId],
    references: [publishers.id],
  }),
}));

export const publisherClaimHistoryRelations = relations(publisherClaimHistory, ({ one }) => ({
  publisher: one(publishers, {
    fields: [publisherClaimHistory.publisherId],
    references: [publishers.id],
  }),
}));

export const shadowPublisherWebsitesRelations = relations(shadowPublisherWebsites, ({ one }) => ({
  publisher: one(publishers, {
    fields: [shadowPublisherWebsites.publisherId],
    references: [publishers.id],
  }),
  website: one(websites, {
    fields: [shadowPublisherWebsites.websiteId],
    references: [websites.id],
  }),
  verifiedByUser: one(users, {
    fields: [shadowPublisherWebsites.verifiedBy],
    references: [users.id],
  }),
}));

export const emailFollowUpsRelations = relations(emailFollowUps, ({ one }) => ({
  originalLog: one(emailProcessingLogs, {
    fields: [emailFollowUps.originalLogId],
    references: [emailProcessingLogs.id],
  }),
  publisher: one(publishers, {
    fields: [emailFollowUps.publisherId],
    references: [publishers.id],
  }),
  responseLog: one(emailProcessingLogs, {
    fields: [emailFollowUps.responseLogId],
    references: [emailProcessingLogs.id],
  }),
}));