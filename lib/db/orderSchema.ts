import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, clients, workflows } from './schema';
import { bulkAnalysisDomains } from './bulkAnalysisSchema';

// Orders table - central entity for advertiser orders
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  advertiserId: uuid('advertiser_id').references(() => users.id),
  advertiserEmail: varchar('advertiser_email', { length: 255 }).notNull(),
  advertiserName: varchar('advertiser_name', { length: 255 }).notNull(),
  advertiserCompany: varchar('advertiser_company', { length: 255 }),
  
  // Status tracking
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  
  // Pricing (in cents)
  subtotalRetail: integer('subtotal_retail').notNull().default(0),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0'),
  discountAmount: integer('discount_amount').notNull().default(0),
  totalRetail: integer('total_retail').notNull().default(0),
  totalWholesale: integer('total_wholesale').notNull().default(0),
  profitMargin: integer('profit_margin').notNull().default(0),
  
  // Optional services
  includesClientReview: boolean('includes_client_review').default(false),
  clientReviewFee: integer('client_review_fee').default(0),
  rushDelivery: boolean('rush_delivery').default(false),
  rushFee: integer('rush_fee').default(0),
  
  // Sharing
  shareToken: varchar('share_token', { length: 255 }).unique(),
  shareExpiresAt: timestamp('share_expires_at'),
  
  // Important dates
  approvedAt: timestamp('approved_at'),
  invoicedAt: timestamp('invoiced_at'),
  paidAt: timestamp('paid_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  
  // Metadata
  createdBy: uuid('created_by').notNull().references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  internalNotes: text('internal_notes'),
  advertiserNotes: text('advertiser_notes'),
  cancellationReason: text('cancellation_reason'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => ({
  clientIdIdx: index('idx_orders_client_id').on(table.clientId),
  advertiserIdIdx: index('idx_orders_advertiser_id').on(table.advertiserId),
  statusIdx: index('idx_orders_status').on(table.status),
  shareTokenIdx: index('idx_orders_share_token').on(table.shareToken),
  createdByIdx: index('idx_orders_created_by').on(table.createdBy),
}));

// Order items - individual domains in an order
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  domainId: uuid('domain_id').notNull().references(() => bulkAnalysisDomains.id),
  
  // Snapshot data
  domain: varchar('domain', { length: 255 }).notNull(),
  domainRating: integer('domain_rating'),
  traffic: integer('traffic'),
  retailPrice: integer('retail_price').notNull(),
  wholesalePrice: integer('wholesale_price').notNull(),
  
  // Execution tracking
  workflowId: uuid('workflow_id').references(() => workflows.id),
  workflowStatus: varchar('workflow_status', { length: 50 }),
  workflowCreatedAt: timestamp('workflow_created_at'),
  workflowCompletedAt: timestamp('workflow_completed_at'),
  
  // Publication tracking
  publishedUrl: varchar('published_url', { length: 500 }),
  publishedAt: timestamp('published_at'),
  publicationVerified: boolean('publication_verified').default(false),
  
  // Issue tracking
  hasIssues: boolean('has_issues').default(false),
  issueNotes: text('issue_notes'),
  issueResolvedAt: timestamp('issue_resolved_at'),
  
  // Status
  status: varchar('status', { length: 50 }).default('pending'),
  
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => ({
  orderIdIdx: index('idx_order_items_order_id').on(table.orderId),
  domainIdIdx: index('idx_order_items_domain_id').on(table.domainId),
  workflowIdIdx: index('idx_order_items_workflow_id').on(table.workflowId),
  statusIdx: index('idx_order_items_status').on(table.status),
}));

// Share tokens for pre-account access
export const orderShareTokens = pgTable('order_share_tokens', {
  token: varchar('token', { length: 255 }).primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  permissions: text('permissions').array().default(['view']),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull(),
  
  // Usage tracking
  usedAt: timestamp('used_at'),
  usedByIp: varchar('used_by_ip', { length: 45 }),
  useCount: integer('use_count').default(0),
});

// Advertiser access to orders
export const advertiserOrderAccess = pgTable('advertiser_order_access', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  accessLevel: varchar('access_level', { length: 50 }).notNull().default('view'),
  grantedAt: timestamp('granted_at').notNull(),
  grantedBy: uuid('granted_by').notNull().references(() => users.id),
}, (table) => ({
  uniqueUserOrder: unique().on(table.userId, table.orderId),
}));

// Domain suggestions
export const domainSuggestions = pgTable('domain_suggestions', {
  id: uuid('id').primaryKey(),
  advertiserId: uuid('advertiser_id').references(() => users.id),
  advertiserEmail: varchar('advertiser_email', { length: 255 }),
  domainId: uuid('domain_id').notNull().references(() => bulkAnalysisDomains.id),
  orderId: uuid('order_id').references(() => orders.id),
  
  // Matching metadata
  matchScore: integer('match_score'),
  matchReasons: text('match_reasons').array(),
  
  // Pricing snapshot
  retailPrice: integer('retail_price').notNull(),
  
  // Suggestion metadata
  suggestedBy: uuid('suggested_by').notNull().references(() => users.id),
  suggestedAt: timestamp('suggested_at').notNull(),
  expiresAt: timestamp('expires_at'),
  
  // Advertiser response
  status: varchar('status', { length: 50 }).default('pending'),
  viewedAt: timestamp('viewed_at'),
  responseAt: timestamp('response_at'),
  advertiserNotes: text('advertiser_notes'),
}, (table) => ({
  advertiserIdx: index('idx_suggestions_advertiser').on(table.advertiserId, table.advertiserEmail),
  domainIdx: index('idx_suggestions_domain').on(table.domainId),
  statusIdx: index('idx_suggestions_status').on(table.status),
}));

// Pricing rules
export const pricingRules = pgTable('pricing_rules', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').references(() => clients.id),
  name: varchar('name', { length: 255 }).notNull(),
  minQuantity: integer('min_quantity').notNull(),
  maxQuantity: integer('max_quantity'),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull(),
  
  // Validity
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until'),
  
  // Metadata
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => ({
  clientIdx: index('idx_pricing_rules_client').on(table.clientId),
  quantityIdx: index('idx_pricing_rules_quantity').on(table.minQuantity, table.maxQuantity),
}));

// Order status history
export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  oldStatus: varchar('old_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  changedBy: uuid('changed_by').notNull().references(() => users.id),
  changedAt: timestamp('changed_at').notNull(),
  notes: text('notes'),
});

// Type exports
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type DomainSuggestion = typeof domainSuggestions.$inferSelect;
export type NewDomainSuggestion = typeof domainSuggestions.$inferInsert;
export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;

// Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  advertiser: one(users, {
    fields: [orders.advertiserId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [orders.assignedTo],
    references: [users.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  domain: one(bulkAnalysisDomains, {
    fields: [orderItems.domainId],
    references: [bulkAnalysisDomains.id],
  }),
  workflow: one(workflows, {
    fields: [orderItems.workflowId],
    references: [workflows.id],
  }),
}));