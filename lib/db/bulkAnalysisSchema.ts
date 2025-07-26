import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clients, users } from './schema';

// Bulk Analysis Domains table for pre-workflow guest post qualification
export const bulkAnalysisDomains = pgTable('bulk_analysis_domains', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  domain: varchar('domain', { length: 255 }).notNull(),
  qualificationStatus: varchar('qualification_status', { length: 50 }).notNull().default('pending'), // 'pending' | 'high_quality' | 'average_quality' | 'disqualified'
  targetPageIds: jsonb('target_page_ids').notNull().default([]), // Array of target page IDs used for analysis
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
  aiQualificationReasoning: text('ai_qualification_reasoning'),
  aiQualifiedAt: timestamp('ai_qualified_at'),
  wasManuallyQualified: boolean('was_manually_qualified').default(false),
  manuallyQualifiedBy: uuid('manually_qualified_by').references(() => users.id),
  manuallyQualifiedAt: timestamp('manually_qualified_at'),
  // Human verification tracking
  wasHumanVerified: boolean('was_human_verified').default(false),
  humanVerifiedBy: uuid('human_verified_by').references(() => users.id),
  humanVerifiedAt: timestamp('human_verified_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const bulkAnalysisDomainsRelations = relations(bulkAnalysisDomains, ({ one }) => ({
  client: one(clients, {
    fields: [bulkAnalysisDomains.clientId],
    references: [clients.id],
  }),
  checkedByUser: one(users, {
    fields: [bulkAnalysisDomains.checkedBy],
    references: [users.id],
  }),
}));

export type BulkAnalysisDomain = typeof bulkAnalysisDomains.$inferSelect;
export type NewBulkAnalysisDomain = typeof bulkAnalysisDomains.$inferInsert;