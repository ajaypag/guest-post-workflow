import { pgTable, uuid, varchar, integer, timestamp, jsonb, boolean, text, index, unique } from 'drizzle-orm/pg-core';
import { orders } from './orderSchema';
import { clients, users, targetPages } from './schema';
import { bulkAnalysisDomains } from './bulkAnalysisSchema';
import { relations } from 'drizzle-orm';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

/**
 * Order Line Items - Each link is a separate line item
 * This replaces the complex orderGroups + submissions model
 */
export const orderLineItems = pgTable('order_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Client & Target Information
  clientId: uuid('client_id').notNull().references(() => clients.id),
  targetPageId: uuid('target_page_id').references(() => targetPages.id),
  targetPageUrl: varchar('target_page_url', { length: 500 }),
  anchorText: varchar('anchor_text', { length: 255 }),
  
  // Status Tracking
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  // draft -> pending_selection -> selected -> approved -> in_progress -> delivered -> completed
  // Can also be: cancelled, refunded, disputed
  
  // Site Assignment
  assignedDomainId: uuid('assigned_domain_id').references(() => bulkAnalysisDomains.id),
  assignedDomain: varchar('assigned_domain', { length: 255 }),
  assignedAt: timestamp('assigned_at'),
  assignedBy: uuid('assigned_by').references(() => users.id),
  
  // User Assignment (for workload distribution)
  assignedTo: uuid('assigned_to').references(() => users.id),
  assignmentNotes: text('assignment_notes'),
  
  // Pricing (locked at approval)
  estimatedPrice: integer('estimated_price'), // In cents
  approvedPrice: integer('approved_price'), // Locked when client approves
  wholesalePrice: integer('wholesale_price'),
  serviceFee: integer('service_fee').default(SERVICE_FEE_CENTS), // Service fee from config
  finalPrice: integer('final_price'), // What was actually charged
  
  // Client Review
  clientReviewStatus: varchar('client_review_status', { length: 20 }),
  // pending, approved, rejected, change_requested
  clientReviewedAt: timestamp('client_reviewed_at'),
  clientReviewNotes: text('client_review_notes'),
  
  // Publisher Assignment
  publisherId: uuid('publisher_id'),
  publisherOfferingId: uuid('publisher_offering_id'),
  publisherStatus: varchar('publisher_status', { length: 50 }),
  publisherPrice: integer('publisher_price'), // In cents
  platformFee: integer('platform_fee'), // In cents
  publisherNotifiedAt: timestamp('publisher_notified_at'),
  publisherAcceptedAt: timestamp('publisher_accepted_at'),
  publisherSubmittedAt: timestamp('publisher_submitted_at'),
  
  // Delivery Tracking
  workflowId: uuid('workflow_id'),
  draftUrl: varchar('draft_url', { length: 500 }),
  publishedUrl: varchar('published_url', { length: 500 }),
  deliveredAt: timestamp('delivered_at'),
  deliveryNotes: text('delivery_notes'),
  
  // Change Tracking
  addedAt: timestamp('added_at').notNull().defaultNow(),
  addedBy: uuid('added_by').notNull().references(() => users.id),
  modifiedAt: timestamp('modified_at'),
  modifiedBy: uuid('modified_by').references(() => users.id),
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: uuid('cancelled_by').references(() => users.id),
  cancellationReason: text('cancellation_reason'),
  
  // Metadata for flexibility
  metadata: jsonb('metadata').$type<{
    originalGroupId?: string; // For migration tracking
    bulkAnalysisProjectId?: string;
    specialInstructions?: string;
    internalNotes?: string;
    domainMetrics?: {
      dr?: number;
      traffic?: number;
      qualityScore?: number;
    };
    // Publisher attribution metadata
    pricingStrategy?: string;
    attributionSource?: string;
    attributionError?: string;
    attributionTimestamp?: string;
    changeHistory?: Array<{
      timestamp: string;
      changeType: string;
      previousValue: any;
      newValue: any;
      changedBy: string;
      reason?: string;
    }>;
  }>(),
  
  // Display ordering
  displayOrder: integer('display_order').notNull().default(0),
  
  // Versioning for optimistic locking
  version: integer('version').notNull().default(1)
}, (table) => ({
  orderIdIdx: index('line_items_order_id_idx').on(table.orderId),
  clientIdIdx: index('line_items_client_id_idx').on(table.clientId),
  statusIdx: index('line_items_status_idx').on(table.status),
  assignedDomainIdx: index('line_items_assigned_domain_idx').on(table.assignedDomainId),
  assignedToIdx: index('line_items_assigned_to_idx').on(table.assignedTo),
  assignedStatusIdx: index('line_items_assigned_status_idx').on(table.assignedTo, table.status),
}));

/**
 * Line Item Change Log - Audit trail for all changes
 */
export const lineItemChanges = pgTable('line_item_changes', {
  id: uuid('id').primaryKey().defaultRandom(),
  lineItemId: uuid('line_item_id').notNull().references(() => orderLineItems.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  changeType: varchar('change_type', { length: 50 }).notNull(),
  // created, status_changed, client_changed, domain_assigned, domain_changed, 
  // price_changed, cancelled, restored, target_changed, anchor_changed
  
  previousValue: jsonb('previous_value'),
  newValue: jsonb('new_value'),
  
  changedBy: uuid('changed_by').notNull().references(() => users.id),
  changedAt: timestamp('changed_at').notNull().defaultNow(),
  changeReason: text('change_reason'),
  
  // For grouping bulk changes
  batchId: uuid('batch_id'),
  
  metadata: jsonb('metadata')
}, (table) => ({
  lineItemIdIdx: index('changes_line_item_id_idx').on(table.lineItemId),
  orderIdIdx: index('changes_order_id_idx').on(table.orderId),
  changedAtIdx: index('changes_changed_at_idx').on(table.changedAt),
  batchIdIdx: index('changes_batch_id_idx').on(table.batchId),
}));

/**
 * Line Item Templates - For bulk creation
 */
export const lineItemTemplates = pgTable('line_item_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Template data
  clientId: uuid('client_id').notNull().references(() => clients.id),
  targetPageUrl: varchar('target_page_url', { length: 500 }),
  anchorTextPattern: varchar('anchor_text_pattern', { length: 500 }),
  // Can use placeholders like {keyword}, {brand}, {number}
  
  quantity: integer('quantity').notNull().default(1),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  
  metadata: jsonb('metadata')
});

// Relations
export const orderLineItemsRelations = relations(orderLineItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderLineItems.orderId],
    references: [orders.id],
  }),
  client: one(clients, {
    fields: [orderLineItems.clientId],
    references: [clients.id],
  }),
  targetPage: one(targetPages, {
    fields: [orderLineItems.targetPageId],
    references: [targetPages.id],
  }),
  assignedDomain: one(bulkAnalysisDomains, {
    fields: [orderLineItems.assignedDomainId],
    references: [bulkAnalysisDomains.id],
  }),
  addedByUser: one(users, {
    fields: [orderLineItems.addedBy],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [orderLineItems.assignedTo],
    references: [users.id],
  }),
  changes: many(lineItemChanges),
}));

export const lineItemChangesRelations = relations(lineItemChanges, ({ one }) => ({
  lineItem: one(orderLineItems, {
    fields: [lineItemChanges.lineItemId],
    references: [orderLineItems.id],
  }),
  order: one(orders, {
    fields: [lineItemChanges.orderId],
    references: [orders.id],
  }),
  changedByUser: one(users, {
    fields: [lineItemChanges.changedBy],
    references: [users.id],
  }),
}));

// Type exports for TypeScript
export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type NewOrderLineItem = typeof orderLineItems.$inferInsert;
export type LineItemChange = typeof lineItemChanges.$inferSelect;
export type NewLineItemChange = typeof lineItemChanges.$inferInsert;
export type LineItemTemplate = typeof lineItemTemplates.$inferSelect;
export type NewLineItemTemplate = typeof lineItemTemplates.$inferInsert;