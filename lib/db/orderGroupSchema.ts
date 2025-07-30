import { pgTable, uuid, varchar, text, timestamp, boolean, integer, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders, orderItems } from './orderSchema';
import { clients, users } from './schema';
import { bulkAnalysisProjects, bulkAnalysisDomains } from './bulkAnalysisSchema';

/**
 * Order Groups - Client segments within orders
 * Supports both single and multi-client orders seamlessly
 */
export const orderGroups = pgTable('order_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  
  // Configuration
  linkCount: integer('link_count').notNull(),
  targetPages: jsonb('target_pages').default('[]').$type<Array<{url: string, pageId?: string}>>(),
  anchorTexts: jsonb('anchor_texts').default('[]').$type<string[]>(),
  requirementOverrides: jsonb('requirement_overrides').default('{}').$type<Record<string, any>>(),
  
  // Analysis link
  bulkAnalysisProjectId: uuid('bulk_analysis_project_id').references(() => bulkAnalysisProjects.id),
  analysisStartedAt: timestamp('analysis_started_at'),
  analysisCompletedAt: timestamp('analysis_completed_at'),
  
  // Status
  groupStatus: varchar('group_status', { length: 50 }).default('pending'),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('idx_order_groups_order').on(table.orderId),
  clientIdx: index('idx_order_groups_client').on(table.clientId),
  analysisIdx: index('idx_order_groups_analysis').on(table.bulkAnalysisProjectId),
}));

/**
 * Order Site Selections - Site review mechanism
 * Tracks all analyzed sites and which ones were selected
 */
export const orderSiteSelections = pgTable('order_site_selections', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderGroupId: uuid('order_group_id').notNull().references(() => orderGroups.id, { onDelete: 'cascade' }),
  domainId: uuid('domain_id').notNull().references(() => bulkAnalysisDomains.id),
  
  // Selection details
  status: varchar('status', { length: 50 }).notNull().default('suggested'),
  // Statuses: suggested, approved, rejected, alternate
  
  // Assignment (once approved)
  targetPageUrl: text('target_page_url'),
  anchorText: varchar('anchor_text', { length: 255 }),
  
  // Review tracking
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  clientNotes: text('client_notes'),
  internalNotes: text('internal_notes'),
  
  // Becomes order_item when approved
  orderItemId: uuid('order_item_id').references(() => orderItems.id),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  groupIdx: index('idx_selections_group').on(table.orderGroupId),
  statusIdx: index('idx_selections_status').on(table.status),
  domainIdx: index('idx_selections_domain').on(table.domainId),
}));

// Type exports
export type OrderGroup = typeof orderGroups.$inferSelect;
export type NewOrderGroup = typeof orderGroups.$inferInsert;
export type OrderSiteSelection = typeof orderSiteSelections.$inferSelect;
export type NewOrderSiteSelection = typeof orderSiteSelections.$inferInsert;

// Relations
export const orderGroupsRelations = relations(orderGroups, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderGroups.orderId],
    references: [orders.id],
  }),
  client: one(clients, {
    fields: [orderGroups.clientId],
    references: [clients.id],
  }),
  bulkAnalysisProject: one(bulkAnalysisProjects, {
    fields: [orderGroups.bulkAnalysisProjectId],
    references: [bulkAnalysisProjects.id],
  }),
  siteSelections: many(orderSiteSelections),
}));

export const orderSiteSelectionsRelations = relations(orderSiteSelections, ({ one }) => ({
  orderGroup: one(orderGroups, {
    fields: [orderSiteSelections.orderGroupId],
    references: [orderGroups.id],
  }),
  domain: one(bulkAnalysisDomains, {
    fields: [orderSiteSelections.domainId],
    references: [bulkAnalysisDomains.id],
  }),
  reviewedByUser: one(users, {
    fields: [orderSiteSelections.reviewedBy],
    references: [users.id],
  }),
  orderItem: one(orderItems, {
    fields: [orderSiteSelections.orderItemId],
    references: [orderItems.id],
  }),
}));