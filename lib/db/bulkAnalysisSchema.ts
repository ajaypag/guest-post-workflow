import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clients, users } from './schema';

// Bulk Analysis Projects table for organizing domains into campaigns
export const bulkAnalysisProjects = pgTable('bulk_analysis_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }), // For UI distinction (#FF5733)
  icon: varchar('icon', { length: 50 }), // emoji or icon name
  status: varchar('status', { length: 50 }).default('active'), // active, archived, completed
  
  // Settings
  autoApplyKeywords: jsonb('auto_apply_keywords').default([]), // Default keywords for new domains
  tags: jsonb('tags').default([]), // For filtering/organization
  
  // Quick stats (updated via code, not triggers for now)
  domainCount: integer('domain_count').default(0),
  qualifiedCount: integer('qualified_count').default(0), 
  workflowCount: integer('workflow_count').default(0),
  lastActivityAt: timestamp('last_activity_at'),
  
  // Metadata
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    clientIdIdx: index('idx_bulk_projects_client').on(table.clientId),
    statusIdx: index('idx_bulk_projects_status').on(table.status),
  };
});

// Bulk Analysis Domains table for pre-workflow guest post qualification
export const bulkAnalysisDomains = pgTable('bulk_analysis_domains', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  domain: varchar('domain', { length: 255 }).notNull(),
  qualificationStatus: varchar('qualification_status', { length: 50 }).notNull().default('pending'), // 'pending' | 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified'
  targetPageIds: jsonb('target_page_ids').notNull().default([]), // Array of target page IDs used for analysis
  selectedTargetPageId: uuid('selected_target_page_id'), // Selected target page for workflow creation
  keywordCount: integer('keyword_count').default(0),
  checkedBy: uuid('checked_by').references(() => users.id),
  checkedAt: timestamp('checked_at'),
  notes: text('notes'), // Optional notes about qualification decision
  hasWorkflow: boolean('has_workflow').default(false),
  workflowId: uuid('workflow_id'),
  workflowCreatedAt: timestamp('workflow_created_at'),
  // Data source tracking
  hasDataForSeoResults: boolean('has_dataforseo_results').default(false),
  dataForSeoLastAnalyzed: timestamp('dataforseo_last_analyzed'),
  dataForSeoResultsCount: integer('dataforseo_results_count').default(0),
  aiQualificationReasoning: text('ai_qualification_reasoning'),
  aiQualifiedAt: timestamp('ai_qualified_at'),
  wasManuallyQualified: boolean('was_manually_qualified').default(false),
  // AI Qualification V2 fields
  overlapStatus: varchar('overlap_status', { length: 20 }), // 'direct' | 'related' | 'both' | 'none'
  authorityDirect: varchar('authority_direct', { length: 20 }), // 'strong' | 'moderate' | 'weak' | 'n/a'
  authorityRelated: varchar('authority_related', { length: 20 }), // 'strong' | 'moderate' | 'weak' | 'n/a'
  topicScope: varchar('topic_scope', { length: 20 }), // 'short_tail' | 'long_tail' | 'ultra_long_tail'
  topicReasoning: text('topic_reasoning'), // Modifier guidance for topic creation
  evidence: jsonb('evidence'), // { direct_count, direct_median_position, related_count, related_median_position }
  qualificationData: jsonb('qualification_data'), // { evidence: { direct_keywords: string[], related_keywords: string[] } }
  manuallyQualifiedBy: uuid('manually_qualified_by').references(() => users.id),
  manuallyQualifiedAt: timestamp('manually_qualified_at'),
  // Human verification tracking
  wasHumanVerified: boolean('was_human_verified').default(false),
  humanVerifiedBy: uuid('human_verified_by').references(() => users.id),
  humanVerifiedAt: timestamp('human_verified_at'),
  // Project support - required going forward
  projectId: uuid('project_id').references(() => bulkAnalysisProjects.id, { onDelete: 'cascade' }),
  projectAddedAt: timestamp('project_added_at'),
  // Duplicate tracking fields
  duplicateOf: uuid('duplicate_of'),
  duplicateResolution: varchar('duplicate_resolution', { length: 50 }),
  duplicateResolvedBy: uuid('duplicate_resolved_by').references(() => users.id),
  duplicateResolvedAt: timestamp('duplicate_resolved_at'),
  originalProjectId: uuid('original_project_id').references(() => bulkAnalysisProjects.id),
  resolutionMetadata: jsonb('resolution_metadata'),
  // Target URL matching fields
  suggestedTargetUrl: text('suggested_target_url'), // AI's top target URL recommendation
  targetMatchData: jsonb('target_match_data'), // Complete AI target URL analysis results
  targetMatchedAt: timestamp('target_matched_at'), // When target URL matching was performed
  // User curation fields for Vetted Sites feature
  userBookmarked: boolean('user_bookmarked').default(false), // User has marked this domain as a favorite
  userHidden: boolean('user_hidden').default(false), // User has hidden this domain from their view
  userBookmarkedAt: timestamp('user_bookmarked_at'), // When domain was bookmarked
  userHiddenAt: timestamp('user_hidden_at'), // When domain was hidden
  userBookmarkedBy: uuid('user_bookmarked_by').references(() => users.id), // User who bookmarked
  userHiddenBy: uuid('user_hidden_by').references(() => users.id), // User who hid domain
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => {
  return {
    projectIdIdx: index('idx_bulk_domains_project').on(table.projectId),
    // Note: There should be a unique constraint on (clientId, domain) for upsert operations
    // This is added via migration 0029_add_bulk_analysis_unique_constraint.sql
    clientDomainIdx: index('idx_bulk_domains_client_domain').on(table.clientId, table.domain),
    // Target URL matching indexes (added in migration 0060_add_target_url_matching.sql)
    suggestedTargetIdx: index('idx_bulk_domains_suggested_target').on(table.suggestedTargetUrl),
    targetMatchedAtIdx: index('idx_bulk_domains_target_matched_at').on(table.targetMatchedAt),
    // User curation indexes (added in migration 0067_add_user_curation_to_bulk_analysis.sql)
    userBookmarkedIdx: index('idx_bulk_analysis_user_bookmarked').on(table.userBookmarked),
    userHiddenIdx: index('idx_bulk_analysis_user_hidden').on(table.userHidden),
    userActionsIdx: index('idx_bulk_analysis_user_actions').on(table.userBookmarkedBy, table.userBookmarked, table.userHidden),
    userActivityIdx: index('idx_bulk_analysis_user_activity').on(table.userBookmarkedAt, table.userHiddenAt),
  };
});

// Relations
export const bulkAnalysisDomainsRelations = relations(bulkAnalysisDomains, ({ one }) => ({
  client: one(clients, {
    fields: [bulkAnalysisDomains.clientId],
    references: [clients.id],
  }),
  checkedByUser: one(users, {
    fields: [bulkAnalysisDomains.checkedBy],
    references: [users.id],
  }),
  project: one(bulkAnalysisProjects, {
    fields: [bulkAnalysisDomains.projectId],
    references: [bulkAnalysisProjects.id],
  }),
}));

export const bulkAnalysisProjectsRelations = relations(bulkAnalysisProjects, ({ one, many }) => ({
  client: one(clients, {
    fields: [bulkAnalysisProjects.clientId],
    references: [clients.id],
  }),
  createdByUser: one(users, {
    fields: [bulkAnalysisProjects.createdBy],
    references: [users.id],
  }),
  domains: many(bulkAnalysisDomains),
}));

// Types
export type BulkAnalysisDomain = typeof bulkAnalysisDomains.$inferSelect;
export type NewBulkAnalysisDomain = typeof bulkAnalysisDomains.$inferInsert;
export type BulkAnalysisProject = typeof bulkAnalysisProjects.$inferSelect;
export type NewBulkAnalysisProject = typeof bulkAnalysisProjects.$inferInsert;