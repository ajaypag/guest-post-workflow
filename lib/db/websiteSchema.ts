import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clients } from './schema';
import { bulkAnalysisProjects } from './bulkAnalysisSchema';
import { users } from './schema';
import { workflows } from './schema';

// Website table to store Airtable data locally
export const websites = pgTable('websites', {
  id: uuid('id').primaryKey(),
  airtableId: varchar('airtable_id', { length: 255 }).notNull().unique(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  domainRating: integer('domain_rating'),
  totalTraffic: integer('total_traffic'),
  guestPostCost: decimal('guest_post_cost', { precision: 10, scale: 2 }),
  categories: text('categories').array(),
  niche: text('niche').array(), // PostgreSQL array of niches
  type: text('type').array(),
  websiteType: text('website_type').array(), // New: SaaS, Blog, News, eCommerce, etc
  status: varchar('status', { length: 50 }).default('Unknown'),
  hasGuestPost: boolean('has_guest_post').default(false),
  hasLinkInsert: boolean('has_link_insert').default(false),
  publishedOpportunities: integer('published_opportunities').default(0),
  overallQuality: varchar('overall_quality', { length: 255 }),
  
  // Airtable metadata
  airtableCreatedAt: timestamp('airtable_created_at').notNull(),
  airtableUpdatedAt: timestamp('airtable_updated_at').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  
  // Local metadata
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Website contacts table
export const websiteContacts = pgTable('website_contacts', {
  id: uuid('id').primaryKey(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  
  email: varchar('email', { length: 255 }).notNull(),
  isPrimary: boolean('is_primary').default(false),
  hasPaidGuestPost: boolean('has_paid_guest_post').default(false),
  hasSwapOption: boolean('has_swap_option').default(false),
  guestPostCost: decimal('guest_post_cost', { precision: 10, scale: 2 }),
  linkInsertCost: decimal('link_insert_cost', { precision: 10, scale: 2 }),
  requirement: varchar('requirement', { length: 50 }), // 'Paid', 'Swap', etc
  status: varchar('status', { length: 50 }).default('Active'),
  
  // Airtable reference
  airtableLinkPriceId: varchar('airtable_link_price_id', { length: 255 }).unique(),
  
  // Local enrichment
  lastContacted: timestamp('last_contacted'),
  responseRate: decimal('response_rate', { precision: 5, scale: 2 }), // Percentage
  averageResponseTime: integer('average_response_time'), // Hours
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

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
export const websitesRelations = relations(websites, ({ many }) => ({
  contacts: many(websiteContacts),
  qualifications: many(websiteQualifications),
  projectWebsites: many(projectWebsites),
  workflowWebsites: many(workflowWebsites),
  syncLogs: many(websiteSyncLogs),
}));

export const websiteContactsRelations = relations(websiteContacts, ({ one }) => ({
  website: one(websites, {
    fields: [websiteContacts.websiteId],
    references: [websites.id],
  }),
}));

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