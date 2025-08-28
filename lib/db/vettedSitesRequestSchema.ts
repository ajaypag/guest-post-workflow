import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { accounts } from './accountSchema';
import { users } from './schema';
import { clients } from './schema';
import { bulkAnalysisProjects, bulkAnalysisDomains } from './bulkAnalysisSchema';

// ============================================================================
// VETTED SITES REQUESTS TABLE
// ============================================================================

export const vettedSitesRequests = pgTable('vetted_sites_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Account relationship (nullable for sales tool)
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Request details
  targetUrls: text('target_urls').array().notNull(),
  filters: jsonb('filters').$type<{
    minDa?: number;
    maxCost?: number;
    topics?: string[];
    keywords?: string[];
    excludeDomains?: string[];
    includeOnlyDomains?: string[];
  }>().default({}),
  notes: text('notes'),
  
  // Status tracking
  status: varchar('status', { length: 50 }).notNull().default('submitted'),
  // Values: 'submitted' | 'approved' | 'in_progress' | 'fulfilled' | 'rejected' | 'expired'
  
  // Internal management
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  fulfilledBy: uuid('fulfilled_by').references(() => users.id),
  fulfilledAt: timestamp('fulfilled_at'),
  
  // Sales tool fields
  isSalesRequest: boolean('is_sales_request').default(false),
  createdByUser: uuid('created_by_user').references(() => users.id),
  prospectName: varchar('prospect_name', { length: 255 }),
  prospectEmail: varchar('prospect_email', { length: 255 }),
  prospectCompany: varchar('prospect_company', { length: 255 }),
  shareToken: varchar('share_token', { length: 255 }).unique(),
  shareExpiresAt: timestamp('share_expires_at'),
  proposalVideoUrl: text('proposal_video_url'),
  proposalMessage: text('proposal_message'),
  
  // Share token email fields (added migration 0074)
  shareRecipientEmail: varchar('share_recipient_email', { length: 255 }),
  shareRecipientName: varchar('share_recipient_name', { length: 255 }),
  shareCustomMessage: text('share_custom_message'),
  shareEmailSentAt: timestamp('share_email_sent_at'),
  
  // Attribution tracking
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  referringUrl: text('referring_url'),
  
  // Claim functionality
  claimedByAccount: uuid('claimed_by_account').references(() => accounts.id),
  claimedAt: timestamp('claimed_at'),
  claimToken: varchar('claim_token', { length: 255 }).unique(),
  claimExpiresAt: timestamp('claim_expires_at'),
  
  // Metrics
  domainCount: integer('domain_count').default(0),
  qualifiedDomainCount: integer('qualified_domain_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    accountIdx: index('idx_vetted_requests_account').on(table.accountId),
    statusIdx: index('idx_vetted_requests_status').on(table.status),
    createdAtIdx: index('idx_vetted_requests_created_at').on(table.createdAt),
    shareTokenIdx: index('idx_vetted_requests_share_token').on(table.shareToken),
    claimTokenIdx: index('idx_vetted_requests_claim_token').on(table.claimToken),
    salesIdx: index('idx_vetted_requests_sales').on(table.isSalesRequest),
    reviewedIdx: index('idx_vetted_requests_reviewed').on(table.reviewedAt),
    fulfilledIdx: index('idx_vetted_requests_fulfilled').on(table.fulfilledAt),
  };
});

// ============================================================================
// JUNCTION TABLES
// ============================================================================

export const vettedRequestClients = pgTable('vetted_request_clients', {
  requestId: uuid('request_id').notNull().references(() => vettedSitesRequests.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.requestId, table.clientId] }),
    requestIdx: index('idx_request_clients_request').on(table.requestId),
    clientIdx: index('idx_request_clients_client').on(table.clientId),
  };
});

export const vettedRequestProjects = pgTable('vetted_request_projects', {
  requestId: uuid('request_id').notNull().references(() => vettedSitesRequests.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => bulkAnalysisProjects.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.requestId, table.projectId] }),
    requestIdx: index('idx_request_projects_request').on(table.requestId),
    projectIdx: index('idx_request_projects_project').on(table.projectId),
  };
});

// ============================================================================
// RELATIONS
// ============================================================================

export const vettedSitesRequestsRelations = relations(vettedSitesRequests, ({ one, many }) => ({
  account: one(accounts, {
    fields: [vettedSitesRequests.accountId],
    references: [accounts.id],
  }),
  reviewedByUser: one(users, {
    fields: [vettedSitesRequests.reviewedBy],
    references: [users.id],
    relationName: 'reviewedBy',
  }),
  approvedByUser: one(users, {
    fields: [vettedSitesRequests.approvedBy],
    references: [users.id],
    relationName: 'approvedBy',
  }),
  fulfilledByUser: one(users, {
    fields: [vettedSitesRequests.fulfilledBy],
    references: [users.id],
    relationName: 'fulfilledBy',
  }),
  createdByInternalUser: one(users, {
    fields: [vettedSitesRequests.createdByUser],
    references: [users.id],
    relationName: 'createdBy',
  }),
  claimedByAccountRel: one(accounts, {
    fields: [vettedSitesRequests.claimedByAccount],
    references: [accounts.id],
    relationName: 'claimedBy',
  }),
  requestClients: many(vettedRequestClients),
  requestProjects: many(vettedRequestProjects),
}));

export const vettedRequestClientsRelations = relations(vettedRequestClients, ({ one }) => ({
  request: one(vettedSitesRequests, {
    fields: [vettedRequestClients.requestId],
    references: [vettedSitesRequests.id],
  }),
  client: one(clients, {
    fields: [vettedRequestClients.clientId],
    references: [clients.id],
  }),
}));

export const vettedRequestProjectsRelations = relations(vettedRequestProjects, ({ one }) => ({
  request: one(vettedSitesRequests, {
    fields: [vettedRequestProjects.requestId],
    references: [vettedSitesRequests.id],
  }),
  project: one(bulkAnalysisProjects, {
    fields: [vettedRequestProjects.projectId],
    references: [bulkAnalysisProjects.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type VettedSitesRequest = typeof vettedSitesRequests.$inferSelect;
export type NewVettedSitesRequest = typeof vettedSitesRequests.$inferInsert;
export type VettedRequestClient = typeof vettedRequestClients.$inferSelect;
export type NewVettedRequestClient = typeof vettedRequestClients.$inferInsert;
export type VettedRequestProject = typeof vettedRequestProjects.$inferSelect;
export type NewVettedRequestProject = typeof vettedRequestProjects.$inferInsert;

// Status type
export type VettedSitesRequestStatus = 
  | 'submitted' 
  | 'approved' 
  | 'in_progress'
  | 'fulfilled' 
  | 'rejected' 
  | 'expired';

// Filter type
export interface VettedSitesRequestFilters {
  minDa?: number;
  maxCost?: number;
  topics?: string[];
  keywords?: string[];
  excludeDomains?: string[];
  includeOnlyDomains?: string[];
}