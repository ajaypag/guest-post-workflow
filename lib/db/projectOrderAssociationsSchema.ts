import { pgTable, uuid, timestamp, varchar, text, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './orderSchema';
import { orderGroups } from './orderGroupSchema';
import { bulkAnalysisProjects, bulkAnalysisDomains } from './bulkAnalysisSchema';
import { users } from './schema';

/**
 * Project-Order Associations - Flexible many-to-many relationships
 * Allows bulk analysis projects to be reused across multiple orders for the same client
 */
export const projectOrderAssociations = pgTable('project_order_associations', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Core associations
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  orderGroupId: uuid('order_group_id').notNull().references(() => orderGroups.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => bulkAnalysisProjects.id, { onDelete: 'cascade' }),
  
  // Association metadata
  associationType: varchar('association_type', { length: 50 }).notNull().default('primary'),
  // Types: 'primary' (main project), 'reference' (for comparison), 'archive' (historical)
  
  // Tracking
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  notes: jsonb('notes').$type<{
    reason?: string;
    previousProjectId?: string;
    migrationData?: any;
  }>(),
  
}, (table) => ({
  // Indexes for performance
  orderIdx: index('idx_proj_order_assoc_order').on(table.orderId),
  projectIdx: index('idx_proj_order_assoc_project').on(table.projectId),
  orderGroupIdx: index('idx_proj_order_assoc_order_group').on(table.orderGroupId),
  
  // Ensure unique association per order group and project
  uniqueAssociation: uniqueIndex('unique_order_group_project').on(
    table.orderGroupId,
    table.projectId
  ),
}));

/**
 * Order-specific site selection statuses
 * Tracks submission status separately from bulk analysis qualification
 */
export const orderSiteSubmissions = pgTable('order_site_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Link to order and domain
  orderGroupId: uuid('order_group_id').notNull().references(() => orderGroups.id, { onDelete: 'cascade' }),
  domainId: uuid('domain_id').notNull(), // References bulkAnalysisDomains
  
  // Order-specific status (separate from bulk analysis status)
  submissionStatus: varchar('submission_status', { length: 50 }).notNull().default('pending'),
  // Statuses: 'pending', 'submitted', 'client_approved', 'client_rejected', 'in_progress', 'completed'
  
  // Submission details
  submittedAt: timestamp('submitted_at'),
  submittedBy: uuid('submitted_by').references(() => users.id),
  
  // Client review
  clientReviewedAt: timestamp('client_reviewed_at'),
  clientReviewedBy: uuid('client_reviewed_by').references(() => users.id),
  clientReviewNotes: text('client_review_notes'),
  
  // Completion tracking
  completedAt: timestamp('completed_at'),
  
  // Final placement details
  publishedUrl: text('published_url'),
  publishedAt: timestamp('published_at'),
  
  // Metadata
  metadata: jsonb('metadata').$type<{
    targetPageUrl?: string;
    anchorText?: string;
    specialInstructions?: string;
    qualityScore?: number;
    clientPriority?: 'high' | 'medium' | 'low';
    // Suggestion tracking
    suggestedBy?: string;
    suggestedAt?: string;
    suggestedReason?: string;
    batchId?: string;
    // From bulk analysis
    projectId?: string;
    qualificationStatus?: string;
    hasDataForSeoResults?: boolean;
    notes?: string;
    // Update tracking
    lastUpdatedBy?: string;
    lastUpdatedAt?: string;
    // History tracking
    statusHistory?: Array<{
      status: string;
      timestamp: string;
      updatedBy: string;
      notes?: string;
    }>;
    reviewHistory?: Array<{
      action: 'approve' | 'reject';
      timestamp: string;
      reviewedBy: string;
      reviewerType: 'internal' | 'account';
      notes?: string;
    }>;
    // Allow additional fields for flexibility
    [key: string]: any;
  }>(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orderGroupIdx: index('idx_submissions_order_group').on(table.orderGroupId),
  domainIdx: index('idx_submissions_domain').on(table.domainId),
  statusIdx: index('idx_submissions_status').on(table.submissionStatus),
}));

// Type exports
export type ProjectOrderAssociation = typeof projectOrderAssociations.$inferSelect;
export type NewProjectOrderAssociation = typeof projectOrderAssociations.$inferInsert;
export type OrderSiteSubmission = typeof orderSiteSubmissions.$inferSelect;
export type NewOrderSiteSubmission = typeof orderSiteSubmissions.$inferInsert;

// Relations
export const projectOrderAssociationsRelations = relations(projectOrderAssociations, ({ one }) => ({
  order: one(orders, {
    fields: [projectOrderAssociations.orderId],
    references: [orders.id],
  }),
  orderGroup: one(orderGroups, {
    fields: [projectOrderAssociations.orderGroupId],
    references: [orderGroups.id],
  }),
  project: one(bulkAnalysisProjects, {
    fields: [projectOrderAssociations.projectId],
    references: [bulkAnalysisProjects.id],
  }),
  createdByUser: one(users, {
    fields: [projectOrderAssociations.createdBy],
    references: [users.id],
  }),
}));

export const orderSiteSubmissionsRelations = relations(orderSiteSubmissions, ({ one }) => ({
  orderGroup: one(orderGroups, {
    fields: [orderSiteSubmissions.orderGroupId],
    references: [orderGroups.id],
  }),
  domain: one(bulkAnalysisDomains, {
    fields: [orderSiteSubmissions.domainId],
    references: [bulkAnalysisDomains.id],
  }),
  submittedByUser: one(users, {
    fields: [orderSiteSubmissions.submittedBy],
    references: [users.id],
  }),
  clientReviewedByUser: one(users, {
    fields: [orderSiteSubmissions.clientReviewedBy],
    references: [users.id],
  }),
}));