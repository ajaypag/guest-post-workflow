import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clients } from './schema';
import { bulkAnalysisProjects } from './bulkAnalysisSchema';
import { users } from './schema';
import { workflows } from './schema';

// Website table to store Airtable data locally
export const websites = pgTable('websites', {
  id: uuid('id').primaryKey(),
  airtableId: varchar('airtable_id', { length: 255 }).unique(), // Now nullable to allow manual creation
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  domainRating: integer('domain_rating'),
  totalTraffic: integer('total_traffic'),
  guestPostCost: integer('guest_post_cost'), // Now stores cents instead of dollars
  guestPostCostSource: varchar('guest_post_cost_source', { length: 20 }), // Phase 6C: 'derived_auto', 'derived_override', 'legacy'
  pricingStrategy: varchar('pricing_strategy', { length: 20 }).default('min_price'), // 'min_price', 'max_price', or 'custom' - determines which offering price to use
  customOfferingId: uuid('custom_offering_id'), // The specific offering selected when using custom pricing strategy
  categories: text('categories').array(),
  niche: text('niche').array(), // PostgreSQL array of niches
  type: text('type').array(),
  websiteType: text('website_type').array(), // New: SaaS, Blog, News, eCommerce, etc
  status: varchar('status', { length: 50 }).default('Unknown'),
  hasGuestPost: boolean('has_guest_post').default(false),
  hasLinkInsert: boolean('has_link_insert').default(false),
  publishedOpportunities: integer('published_opportunities').default(0),
  overallQuality: varchar('overall_quality', { length: 255 }),
  
  // Enhanced Publisher Information (added in migration 0020)
  publisherTier: varchar('publisher_tier', { length: 20 }).default('standard'),
  preferredContentTypes: text('preferred_content_types').array(),
  editorialCalendarUrl: varchar('editorial_calendar_url', { length: 500 }),
  contentGuidelinesUrl: varchar('content_guidelines_url', { length: 500 }),
  
  // Publishing Details (added in migration 0020)
  typicalTurnaroundDays: integer('typical_turnaround_days').default(7),
  acceptsDoFollow: boolean('accepts_do_follow').default(true),
  requiresAuthorBio: boolean('requires_author_bio').default(false),
  maxLinksPerPost: integer('max_links_per_post').default(2),
  
  // Business Information (added in migration 0020)
  primaryContactId: uuid('primary_contact_id'),
  publisherCompany: varchar('publisher_company', { length: 255 }),
  websiteLanguage: varchar('website_language', { length: 10 }).default('en'),
  targetAudience: text('target_audience'),
  
  // Performance Tracking (added in migration 0020)
  avgResponseTimeHours: integer('avg_response_time_hours'),
  successRatePercentage: decimal('success_rate_percentage', { precision: 5, scale: 2 }),
  lastCampaignDate: timestamp('last_campaign_date'),
  totalPostsPublished: integer('total_posts_published').default(0),
  
  // Internal Classification (added in migration 0020)
  internalQualityScore: integer('internal_quality_score'),
  internalNotes: text('internal_notes'),
  accountManagerId: uuid('account_manager_id'),
  
  // Publisher CRM Relations (added in migration 0032)
  organizationId: uuid('organization_id'),
  
  // Source tracking (added in migration 0044)
  source: varchar('source', { length: 50 }).default('airtable'),
  addedByPublisherId: uuid('added_by_publisher_id'),
  addedByUserId: uuid('added_by_user_id'),
  sourceMetadata: text('source_metadata'),
  importBatchId: varchar('import_batch_id', { length: 100 }),
  
  // Airtable metadata
  airtableCreatedAt: timestamp('airtable_created_at').notNull(),
  airtableUpdatedAt: timestamp('airtable_updated_at').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  
  // Local metadata
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// NOTE: websiteContacts table was removed in migration 0021
// Replaced by publisher CRM system: publisherContacts + contactWebsiteAssociations

// Website qualifications table
export const websiteQualifications = pgTable('website_qualifications', {
  id: uuid('id').primaryKey(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => bulkAnalysisProjects.id, { onDelete: 'set null' }),
  
  qualifiedAt: timestamp('qualified_at'),
  qualifiedBy: uuid('qualified_by').notNull(), // User ID
  status: varchar('status', { length: 50 }).default('qualified'), // qualified, rejected, pending
  reason: text('reason'), // Why qualified/rejected
  notes: text('notes'),
  
  // Tracking
  importedFrom: varchar('imported_from', { length: 50 }).default('airtable'), // airtable, manual, csv
  
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Project websites table for direct website-project associations
export const projectWebsites = pgTable('project_websites', {
  id: uuid('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => bulkAnalysisProjects.id, { onDelete: 'cascade' }),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  addedBy: uuid('added_by').notNull().references(() => users.id),
  addedAt: timestamp('added_at'),
  analysisStatus: varchar('analysis_status', { length: 50 }).default('pending'),
  dataforSeoData: text('dataforseo_data'), // JSON stored as text
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Workflow websites table for tracking website usage in workflows
export const workflowWebsites = pgTable('workflow_websites', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  stepAdded: varchar('step_added', { length: 100 }).notNull(),
  usageType: varchar('usage_type', { length: 50 }).notNull(), // 'competitor', 'link_target', 'mention', etc.
  addedAt: timestamp('added_at'),
});

// Sync logs for tracking import history
export const websiteSyncLogs = pgTable('website_sync_logs', {
  id: uuid('id').primaryKey(),
  websiteId: uuid('website_id').references(() => websites.id, { onDelete: 'cascade' }),
  
  syncType: varchar('sync_type', { length: 50 }).notNull(), // full, incremental, webhook
  action: varchar('action', { length: 50 }).notNull(), // create, update, delete
  status: varchar('status', { length: 50 }).notNull(), // success, failed, skipped
  
  airtableRecordId: varchar('airtable_record_id', { length: 255 }),
  changes: text('changes'), // JSON stored as text
  error: text('error'),
  
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  recordsProcessed: integer('records_processed').default(0),
});

// Configuration table for sync settings
export const airtableSyncConfig = pgTable('airtable_sync_config', {
  id: uuid('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Webhook events table
export const airtableWebhookEvents = pgTable('airtable_webhook_events', {
  id: uuid('id').primaryKey(),
  webhookId: varchar('webhook_id', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(), // record.created, record.updated, record.deleted
  tableId: varchar('table_id', { length: 255 }).notNull(),
  recordId: varchar('record_id', { length: 255 }).notNull(),
  payload: text('payload').notNull(), // JSON stored as text
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  error: text('error'),
  
  receivedAt: timestamp('received_at'),
});

// Relations
export const websitesRelations = relations(websites, ({ one, many }) => ({
  // Legacy relations
  qualifications: many(websiteQualifications),
  projectWebsites: many(projectWebsites),
  workflowWebsites: many(workflowWebsites),
  syncLogs: many(websiteSyncLogs),
  
  // Enhanced publisher relations (added in migration 0020/0032)
  // Note: Relations to publisherCrmSchema defined in publisherCrmSchema.ts to avoid circular imports
  accountManager: one(users, {
    fields: [websites.accountManagerId],
    references: [users.id],
  }),
}));

// websiteContactsRelations removed - table deprecated in migration 0021

export const websiteQualificationsRelations = relations(websiteQualifications, ({ one }) => ({
  website: one(websites, {
    fields: [websiteQualifications.websiteId],
    references: [websites.id],
  }),
  client: one(clients, {
    fields: [websiteQualifications.clientId],
    references: [clients.id],
  }),
  project: one(bulkAnalysisProjects, {
    fields: [websiteQualifications.projectId],
    references: [bulkAnalysisProjects.id],
  }),
}));

export const projectWebsitesRelations = relations(projectWebsites, ({ one }) => ({
  project: one(bulkAnalysisProjects, {
    fields: [projectWebsites.projectId],
    references: [bulkAnalysisProjects.id],
  }),
  website: one(websites, {
    fields: [projectWebsites.websiteId],
    references: [websites.id],
  }),
  addedByUser: one(users, {
    fields: [projectWebsites.addedBy],
    references: [users.id],
  }),
}));

export const workflowWebsitesRelations = relations(workflowWebsites, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowWebsites.workflowId],
    references: [workflows.id],
  }),
  website: one(websites, {
    fields: [workflowWebsites.websiteId],
    references: [websites.id],
  }),
}));

export const websiteSyncLogsRelations = relations(websiteSyncLogs, ({ one }) => ({
  website: one(websites, {
    fields: [websiteSyncLogs.websiteId],
    references: [websites.id],
  }),
}));