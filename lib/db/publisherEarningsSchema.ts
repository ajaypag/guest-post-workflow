import { pgTable, uuid, varchar, timestamp, bigint, decimal, text, jsonb, date, integer, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { publishers } from './accountSchema';
import { orderLineItems } from './orderLineItemSchema';
import { orders } from './orderSchema';
import { websites } from './websiteSchema';
import { users } from './schema';

// ============================================================================
// Publisher Earnings Tracking
// ============================================================================

export const publisherEarnings = pgTable('publisher_earnings', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').notNull().references(() => publishers.id, { onDelete: 'cascade' }),
  orderLineItemId: uuid('order_line_item_id').references(() => orderLineItems.id, { onDelete: 'set null' }),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  
  // Earnings Details
  earningType: varchar('earning_type', { length: 50 }).notNull(), // 'order_completion', 'bonus', 'referral', 'adjustment'
  amount: bigint('amount', { mode: 'number' }).notNull(), // Amount in cents (positive for earnings, negative for deductions)
  currency: varchar('currency', { length: 3 }).default('USD'),
  
  // Commission Structure
  grossAmount: bigint('gross_amount', { mode: 'number' }), // Total amount before platform fee
  platformFeePercent: decimal('platform_fee_percent', { precision: 5, scale: 2 }), // Platform commission percentage
  platformFeeAmount: bigint('platform_fee_amount', { mode: 'number' }), // Platform commission in cents
  netAmount: bigint('net_amount', { mode: 'number' }).notNull(), // Publisher receives this amount
  
  // Status Tracking
  status: varchar('status', { length: 50 }).default('pending'), // pending, confirmed, processing, paid, cancelled
  confirmedAt: timestamp('confirmed_at'),
  
  // Payment Information
  paymentBatchId: uuid('payment_batch_id'),
  paymentMethod: varchar('payment_method', { length: 50 }), // 'bank_transfer', 'paypal', 'wise', etc.
  paymentReference: varchar('payment_reference', { length: 255 }),
  paidAt: timestamp('paid_at'),
  
  // Additional Context
  websiteId: uuid('website_id').references(() => websites.id),
  description: text('description'),
  metadata: jsonb('metadata').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  publisherIdx: index('idx_publisher_earnings_publisher').on(table.publisherId),
  statusIdx: index('idx_publisher_earnings_status').on(table.status),
  createdIdx: index('idx_publisher_earnings_created').on(table.createdAt),
  paymentBatchIdx: index('idx_publisher_earnings_payment_batch').on(table.paymentBatchId),
}));

// ============================================================================
// Publisher Payment Batches
// ============================================================================

export const publisherPaymentBatches = pgTable('publisher_payment_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchNumber: varchar('batch_number', { length: 50 }).unique().notNull(),
  
  // Batch Details
  publisherId: uuid('publisher_id').references(() => publishers.id),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  
  // Amounts
  totalEarnings: bigint('total_earnings', { mode: 'number' }).notNull(), // Sum of all earnings in batch
  totalDeductions: bigint('total_deductions', { mode: 'number' }).default(0), // Any deductions
  netAmount: bigint('net_amount', { mode: 'number' }).notNull(), // Final payment amount
  
  // Status
  status: varchar('status', { length: 50 }).default('draft'), // draft, approved, processing, completed, failed
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  
  // Payment Details
  paymentReference: varchar('payment_reference', { length: 255 }),
  paymentNotes: text('payment_notes'),
  paidAt: timestamp('paid_at'),
  
  // Error Handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  
  // Metadata
  earningsCount: integer('earnings_count').default(0), // Number of earnings in batch
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  publisherIdx: index('idx_payment_batches_publisher').on(table.publisherId),
  statusIdx: index('idx_payment_batches_status').on(table.status),
  createdIdx: index('idx_payment_batches_created').on(table.createdAt),
}));

// ============================================================================
// Publisher Order Notifications
// ============================================================================

export const publisherOrderNotifications = pgTable('publisher_order_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').notNull().references(() => publishers.id, { onDelete: 'cascade' }),
  orderLineItemId: uuid('order_line_item_id').references(() => orderLineItems.id, { onDelete: 'cascade' }),
  
  // Notification Details
  notificationType: varchar('notification_type', { length: 50 }).notNull(), // 'new_order', 'order_approved', 'payment_sent', etc.
  channel: varchar('channel', { length: 50 }).notNull(), // 'email', 'sms', 'dashboard', 'webhook'
  
  // Status
  status: varchar('status', { length: 50 }).default('pending'), // pending, sent, delivered, failed, read
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  
  // Content
  subject: varchar('subject', { length: 500 }),
  message: text('message'),
  metadata: jsonb('metadata').default({}),
  
  // Error Tracking
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  publisherIdx: index('idx_publisher_notifications_publisher').on(table.publisherId),
  lineItemIdx: index('idx_publisher_notifications_line_item').on(table.orderLineItemId),
  statusIdx: index('idx_publisher_notifications_status').on(table.status),
  typeIdx: index('idx_publisher_notifications_type').on(table.notificationType),
}));

// ============================================================================
// Commission Configuration
// ============================================================================

export const commissionConfigurations = pgTable('commission_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Scope
  scopeType: varchar('scope_type', { length: 50 }).notNull(), // 'global', 'publisher', 'website', 'offering_type'
  scopeId: uuid('scope_id'), // NULL for global, otherwise references publisher/website/etc
  
  // Commission Structure
  commissionType: varchar('commission_type', { length: 50 }).notNull(), // 'percentage', 'fixed', 'tiered'
  baseCommissionPercent: decimal('base_commission_percent', { precision: 5, scale: 2 }), // Base platform commission (e.g., 30%)
  
  // Tiered Commission (JSON structure for complex rules)
  tierRules: jsonb('tier_rules').default([]).$type<Array<{
    minVolume: number;
    maxVolume: number | null;
    commissionPercent: number;
  }>>(),
  
  // Special Rates
  rushOrderCommissionPercent: decimal('rush_order_commission_percent', { precision: 5, scale: 2 }),
  bulkOrderCommissionPercent: decimal('bulk_order_commission_percent', { precision: 5, scale: 2 }),
  
  // Validity
  validFrom: date('valid_from').notNull().defaultNow(),
  validUntil: date('valid_until'),
  isActive: boolean('is_active').default(true),
  
  // Metadata
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  scopeIdx: index('idx_commission_config_scope').on(table.scopeType, table.scopeId),
  activeIdx: index('idx_commission_config_active').on(table.isActive),
  uniqueScopeIdx: uniqueIndex('idx_commission_config_unique_scope')
    .on(table.scopeType, table.scopeId)
    .where('is_active = true AND valid_until IS NULL'),
}));

// ============================================================================
// Publisher Analytics
// ============================================================================

export const publisherOrderAnalytics = pgTable('publisher_order_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').notNull().references(() => publishers.id, { onDelete: 'cascade' }),
  websiteId: uuid('website_id').references(() => websites.id),
  
  // Period
  periodType: varchar('period_type', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly', 'yearly'
  periodDate: date('period_date').notNull(),
  
  // Order Metrics
  totalOrders: integer('total_orders').default(0),
  pendingOrders: integer('pending_orders').default(0),
  completedOrders: integer('completed_orders').default(0),
  cancelledOrders: integer('cancelled_orders').default(0),
  
  // Financial Metrics
  grossEarnings: bigint('gross_earnings', { mode: 'number' }).default(0),
  platformFees: bigint('platform_fees', { mode: 'number' }).default(0),
  netEarnings: bigint('net_earnings', { mode: 'number' }).default(0),
  paidAmount: bigint('paid_amount', { mode: 'number' }).default(0),
  pendingPayment: bigint('pending_payment', { mode: 'number' }).default(0),
  
  // Performance Metrics
  avgCompletionDays: decimal('avg_completion_days', { precision: 10, scale: 2 }),
  acceptanceRate: decimal('acceptance_rate', { precision: 5, scale: 2 }),
  onTimeRate: decimal('on_time_rate', { precision: 5, scale: 2 }),
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }),
  
  // Comparison Metrics
  ordersChangePercent: decimal('orders_change_percent', { precision: 10, scale: 2 }), // vs previous period
  earningsChangePercent: decimal('earnings_change_percent', { precision: 10, scale: 2 }), // vs previous period
  
  // Timestamps
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
}, (table) => ({
  publisherIdx: index('idx_publisher_analytics_publisher').on(table.publisherId),
  periodIdx: index('idx_publisher_analytics_period').on(table.periodType, table.periodDate),
  websiteIdx: index('idx_publisher_analytics_website').on(table.websiteId),
  uniquePeriodIdx: uniqueIndex('idx_publisher_analytics_unique')
    .on(table.publisherId, table.websiteId, table.periodType, table.periodDate),
}));

// ============================================================================
// Relations
// ============================================================================

export const publisherEarningsRelations = relations(publisherEarnings, ({ one }) => ({
  publisher: one(publishers, {
    fields: [publisherEarnings.publisherId],
    references: [publishers.id],
  }),
  orderLineItem: one(orderLineItems, {
    fields: [publisherEarnings.orderLineItemId],
    references: [orderLineItems.id],
  }),
  order: one(orders, {
    fields: [publisherEarnings.orderId],
    references: [orders.id],
  }),
  website: one(websites, {
    fields: [publisherEarnings.websiteId],
    references: [websites.id],
  }),
  paymentBatch: one(publisherPaymentBatches, {
    fields: [publisherEarnings.paymentBatchId],
    references: [publisherPaymentBatches.id],
  }),
}));

export const publisherPaymentBatchesRelations = relations(publisherPaymentBatches, ({ one, many }) => ({
  publisher: one(publishers, {
    fields: [publisherPaymentBatches.publisherId],
    references: [publishers.id],
  }),
  approvedByUser: one(users, {
    fields: [publisherPaymentBatches.approvedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [publisherPaymentBatches.createdBy],
    references: [users.id],
  }),
  earnings: many(publisherEarnings),
}));

export const publisherOrderNotificationsRelations = relations(publisherOrderNotifications, ({ one }) => ({
  publisher: one(publishers, {
    fields: [publisherOrderNotifications.publisherId],
    references: [publishers.id],
  }),
  orderLineItem: one(orderLineItems, {
    fields: [publisherOrderNotifications.orderLineItemId],
    references: [orderLineItems.id],
  }),
}));

export const commissionConfigurationsRelations = relations(commissionConfigurations, ({ one }) => ({
  createdByUser: one(users, {
    fields: [commissionConfigurations.createdBy],
    references: [users.id],
  }),
}));

export const publisherOrderAnalyticsRelations = relations(publisherOrderAnalytics, ({ one }) => ({
  publisher: one(publishers, {
    fields: [publisherOrderAnalytics.publisherId],
    references: [publishers.id],
  }),
  website: one(websites, {
    fields: [publisherOrderAnalytics.websiteId],
    references: [websites.id],
  }),
}));

// ============================================================================
// Type Exports
// ============================================================================

export type PublisherEarning = typeof publisherEarnings.$inferSelect;
export type NewPublisherEarning = typeof publisherEarnings.$inferInsert;

export type PublisherPaymentBatch = typeof publisherPaymentBatches.$inferSelect;
export type NewPublisherPaymentBatch = typeof publisherPaymentBatches.$inferInsert;

export type PublisherOrderNotification = typeof publisherOrderNotifications.$inferSelect;
export type NewPublisherOrderNotification = typeof publisherOrderNotifications.$inferInsert;

export type CommissionConfiguration = typeof commissionConfigurations.$inferSelect;
export type NewCommissionConfiguration = typeof commissionConfigurations.$inferInsert;

export type PublisherOrderAnalytic = typeof publisherOrderAnalytics.$inferSelect;
export type NewPublisherOrderAnalytic = typeof publisherOrderAnalytics.$inferInsert;

// ============================================================================
// Enums and Constants
// ============================================================================

export const EARNING_TYPES = {
  ORDER_COMPLETION: 'order_completion',
  BONUS: 'bonus',
  REFERRAL: 'referral',
  ADJUSTMENT: 'adjustment',
  REFUND: 'refund',
} as const;

export const EARNING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_BATCH_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const NOTIFICATION_TYPES = {
  NEW_ORDER: 'new_order',
  ORDER_APPROVED: 'order_approved',
  ORDER_CANCELLED: 'order_cancelled',
  PAYMENT_SENT: 'payment_sent',
  PAYMENT_RECEIVED: 'payment_received',
} as const;

export const COMMISSION_SCOPE_TYPES = {
  GLOBAL: 'global',
  PUBLISHER: 'publisher',
  WEBSITE: 'website',
  OFFERING_TYPE: 'offering_type',
} as const;

export const PERIOD_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;