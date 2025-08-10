import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, index, unique, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, clients, workflows } from './schema';
import { bulkAnalysisDomains } from './bulkAnalysisSchema';
import { accounts } from './accountSchema';

// Orders table - central entity for account orders
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
  // Note: clientId removed - now in order_groups
  accountId: uuid('account_id').references(() => accounts.id),
  // Note: accountEmail, accountName, accountCompany removed - use account relation
  
  // Order type for supporting different order types
  orderType: varchar('order_type', { length: 50 }).notNull().default('guest_post'),
  
  // Status tracking
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  state: varchar('state', { length: 50 }).default('configuring'),
  // States: configuring → analyzing → reviewing → payment_pending → in_progress → completed
  
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
  
  // Review tracking
  requiresClientReview: boolean('requires_client_review').default(false),
  reviewCompletedAt: timestamp('review_completed_at'),
  
  // Sharing
  shareToken: varchar('share_token', { length: 255 }).unique(),
  shareExpiresAt: timestamp('share_expires_at'),
  
  // Order preferences and expectations
  estimatedBudgetMin: integer('estimated_budget_min'),
  estimatedBudgetMax: integer('estimated_budget_max'),
  estimatedLinksCount: integer('estimated_links_count'),
  preferencesDrMin: integer('preferences_dr_min'),
  preferencesDrMax: integer('preferences_dr_max'),
  preferencesTrafficMin: integer('preferences_traffic_min'),
  preferencesCategories: text('preferences_categories').array(),
  preferencesTypes: text('preferences_types').array(),
  preferencesNiches: text('preferences_niches').array(),
  estimatorSnapshot: jsonb('estimator_snapshot').$type<{
    sitesAvailable: number;
    medianPrice: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    examples: Array<{ domain: string; dr: number; price: number }>;
    timestamp: string;
  }>(),
  estimatedPricePerLink: integer('estimated_price_per_link'),
  actualPricePerLink: integer('actual_price_per_link'),
  preferenceMatchScore: decimal('preference_match_score', { precision: 5, scale: 2 }),
  
  // Template and reordering support
  isTemplate: boolean('is_template').default(false),
  templateName: varchar('template_name', { length: 255 }),
  copiedFromOrderId: uuid('copied_from_order_id'),
  
  // Important dates
  approvedAt: timestamp('approved_at'),
  invoicedAt: timestamp('invoiced_at'),
  invoiceData: jsonb('invoice_data').$type<{
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    billingInfo?: {
      name: string;
      company: string;
      email: string;
      address?: string;
    };
  }>(),
  paidAt: timestamp('paid_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  refundedAt: timestamp('refunded_at'),
  partialRefundAmount: integer('partial_refund_amount'), // Amount refunded for partial refunds
  
  // Metadata
  createdBy: uuid('created_by').notNull().references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  internalNotes: text('internal_notes'),
  accountNotes: text('account_notes'),
  cancellationReason: text('cancellation_reason'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => ({
  accountIdIdx: index('idx_orders_account_id').on(table.accountId),
  statusIdx: index('idx_orders_status').on(table.status),
  stateIdx: index('idx_orders_state').on(table.state),
  orderTypeIdx: index('idx_orders_order_type').on(table.orderType),
  shareTokenIdx: index('idx_orders_share_token').on(table.shareToken),
  createdByIdx: index('idx_orders_created_by').on(table.createdBy),
}));

// Guest post items - individual domains in a guest post order
export const guestPostItems = pgTable('guest_post_items', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  domainId: uuid('domain_id').notNull().references(() => bulkAnalysisDomains.id),
  targetPageId: uuid('target_page_id'), // Added for bulk analysis integration
  
  // Link to unified order system
  orderGroupId: uuid('order_group_id'),
  siteSelectionId: uuid('site_selection_id'),
  
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
  orderIdIdx: index('idx_guest_post_items_order_id').on(table.orderId),
  domainIdIdx: index('idx_guest_post_items_domain_id').on(table.domainId),
  workflowIdIdx: index('idx_guest_post_items_workflow_id').on(table.workflowId),
  statusIdx: index('idx_guest_post_items_status').on(table.status),
}));

// Legacy export for backward compatibility (will be removed after migration)
export const orderItems = guestPostItems;

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

// Account access to orders
export const accountOrderAccess = pgTable('account_order_access', {
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
  accountId: uuid('account_id').references(() => accounts.id),
  accountEmail: varchar('account_email', { length: 255 }),
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
  
  // Account response
  status: varchar('status', { length: 50 }).default('pending'),
  viewedAt: timestamp('viewed_at'),
  responseAt: timestamp('response_at'),
  accountNotes: text('account_notes'),
}, (table) => ({
  accountIdx: index('idx_suggestions_account').on(table.accountId, table.accountEmail),
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
export type GuestPostItem = typeof guestPostItems.$inferSelect;
export type NewGuestPostItem = typeof guestPostItems.$inferInsert;
// Legacy exports for backward compatibility (will be removed later)
export type OrderItem = GuestPostItem;
export type NewOrderItem = NewGuestPostItem;
export type DomainSuggestion = typeof domainSuggestions.$inferSelect;
export type NewDomainSuggestion = typeof domainSuggestions.$inferInsert;
export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;

// Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  account: one(accounts, {
    fields: [orders.accountId],
    references: [accounts.id],
  }),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [orders.assignedTo],
    references: [users.id],
  }),
  items: many(guestPostItems),
  statusHistory: many(orderStatusHistory),
  // Note: order groups relation defined in orderGroupSchema
}));

export const guestPostItemsRelations = relations(guestPostItems, ({ one }) => ({
  order: one(orders, {
    fields: [guestPostItems.orderId],
    references: [orders.id],
  }),
  domain: one(bulkAnalysisDomains, {
    fields: [guestPostItems.domainId],
    references: [bulkAnalysisDomains.id],
  }),
  workflow: one(workflows, {
    fields: [guestPostItems.workflowId],
    references: [workflows.id],
  }),
}));

// Legacy export for backward compatibility
export const orderItemsRelations = guestPostItemsRelations;