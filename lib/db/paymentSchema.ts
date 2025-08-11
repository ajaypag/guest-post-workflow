import { pgTable, uuid, varchar, integer, timestamp, boolean, jsonb, pgEnum, text, index, unique } from 'drizzle-orm/pg-core';
import { orders } from './orderSchema';
import { accounts, users } from './schema';

// Payment status enum
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
  'partial',
  'cancelled'
]);

// Payment method enum
export const paymentMethodEnum = pgEnum('payment_method', [
  'bank_transfer',
  'credit_card',
  'paypal',
  'check',
  'cash',
  'stripe',
  'other'
]);

// Payments table
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  
  // Payment details
  amount: integer('amount').notNull(), // Amount in cents
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  method: paymentMethodEnum('method').notNull(),
  
  // Transaction details
  transactionId: varchar('transaction_id', { length: 255 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  processorResponse: jsonb('processor_response'), // Store raw response from payment processor
  
  // Additional info
  notes: varchar('notes', { length: 1000 }),
  failureReason: varchar('failure_reason', { length: 500 }),
  
  // Metadata
  recordedBy: uuid('recorded_by').references(() => users.id), // Who recorded the payment (internal user ID)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'), // When payment was actually processed
  
  // For partial payments
  isPartial: boolean('is_partial').default(false),
  remainingAmount: integer('remaining_amount'), // For tracking partial payments
}, (table) => ({
  stripePaymentIntentIdx: index('idx_payments_stripe_intent').on(table.stripePaymentIntentId),
  orderIdx: index('idx_payments_order').on(table.orderId),
  accountIdx: index('idx_payments_account').on(table.accountId),
  statusIdx: index('idx_payments_status').on(table.status),
}));

// Invoices table
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  paymentId: uuid('payment_id').references(() => payments.id),
  
  // Invoice details
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, sent, paid, overdue, cancelled
  
  // Amounts
  subtotal: integer('subtotal').notNull(), // in cents
  tax: integer('tax').default(0), // in cents
  discount: integer('discount').default(0), // in cents
  total: integer('total').notNull(), // in cents
  
  // Dates
  issueDate: timestamp('issue_date').defaultNow().notNull(),
  dueDate: timestamp('due_date').notNull(),
  paidDate: timestamp('paid_date'),
  
  // Storage
  fileUrl: varchar('file_url', { length: 500 }), // URL to PDF in cloud storage
  
  // Email tracking
  sentAt: timestamp('sent_at'),
  sentTo: varchar('sent_to', { length: 255 }),
  
  // Line items stored as JSON
  lineItems: jsonb('line_items').notNull(),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Stripe Payment Intents table
export const stripePaymentIntents = pgTable('stripe_payment_intents', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  paymentId: uuid('payment_id').references(() => payments.id),
  
  // Stripe identifiers
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).notNull().unique(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  
  // Payment details
  amount: integer('amount').notNull(), // Amount in cents
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: varchar('status', { length: 50 }).notNull(), // Stripe PI status: requires_payment_method, requires_confirmation, requires_action, processing, requires_capture, canceled, succeeded
  
  // Client secret for frontend integration
  clientSecret: text('client_secret').notNull(),
  
  // Metadata
  metadata: jsonb('metadata'), // Store order ID and other context
  
  // Idempotency and retry handling
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  
  // Processing details
  paymentMethodId: varchar('payment_method_id', { length: 255 }),
  setupFutureUsage: varchar('setup_future_usage', { length: 50 }), // on_session, off_session
  confirmationMethod: varchar('confirmation_method', { length: 50 }).default('automatic'), // automatic, manual
  
  // Captured amounts for partial captures
  amountCapturable: integer('amount_capturable'),
  amountCaptured: integer('amount_captured').default(0),
  amountReceived: integer('amount_received').default(0),
  
  // Processing timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at'),
  succeededAt: timestamp('succeeded_at'),
  canceledAt: timestamp('canceled_at'),
  
  // Last known Stripe webhook event
  lastWebhookEventId: varchar('last_webhook_event_id', { length: 255 }),
  
  // Error tracking
  lastError: jsonb('last_error'), // Store Stripe error details
  failureCode: varchar('failure_code', { length: 100 }),
  failureMessage: text('failure_message'),
}, (table) => ({
  orderIdIdx: index('idx_stripe_payment_intents_order_id').on(table.orderId),
  stripeIdIdx: index('idx_stripe_payment_intents_stripe_id').on(table.stripePaymentIntentId),
  statusIdx: index('idx_stripe_payment_intents_status').on(table.status),
  customerIdx: index('idx_stripe_payment_intents_customer').on(table.stripeCustomerId),
}));

// Stripe Customers table for storing customer data
export const stripeCustomers = pgTable('stripe_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  
  // Stripe customer data
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  
  // Billing information
  billingAddress: jsonb('billing_address'),
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  accountIdx: index('idx_stripe_customers_account').on(table.accountId),
  stripeIdIdx: index('idx_stripe_customers_stripe_id').on(table.stripeCustomerId),
  emailIdx: index('idx_stripe_customers_email').on(table.email),
}));

// Stripe Webhooks table for tracking processed webhooks and preventing duplicates
export const stripeWebhooks = pgTable('stripe_webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Webhook data
  stripeEventId: varchar('stripe_event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  
  // Processing status
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, processed, failed, skipped
  
  // Related entities
  paymentIntentId: uuid('payment_intent_id').references(() => stripePaymentIntents.id),
  orderId: uuid('order_id').references(() => orders.id),
  
  // Event data
  eventData: jsonb('event_data').notNull(), // Full Stripe event object
  
  // Processing details
  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdIdx: index('idx_stripe_webhooks_event_id').on(table.stripeEventId),
  typeIdx: index('idx_stripe_webhooks_type').on(table.eventType),
  statusIdx: index('idx_stripe_webhooks_status').on(table.status),
  orderIdx: index('idx_stripe_webhooks_order').on(table.orderId),
  createdIdx: index('idx_stripe_webhooks_created').on(table.createdAt),
}));

// Refunds table
export const refunds = pgTable('refunds', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  
  // Refund details
  stripeRefundId: varchar('stripe_refund_id', { length: 255 }).notNull(),
  amount: integer('amount').notNull(), // Amount in cents
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: varchar('status', { length: 50 }).notNull(), // pending, succeeded, failed, canceled
  
  // Reason and notes
  reason: varchar('reason', { length: 50 }), // duplicate, fraudulent, requested_by_customer, other
  notes: text('notes'),
  failureReason: varchar('failure_reason', { length: 500 }),
  
  // Tracking
  initiatedBy: uuid('initiated_by').notNull().references(() => users.id),
  metadata: jsonb('metadata'),
  
  // Timestamps
  processedAt: timestamp('processed_at'),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  stripeRefundIdIdx: unique('idx_refunds_stripe_id').on(table.stripeRefundId),
  paymentIdx: index('idx_refunds_payment').on(table.paymentId),
  orderIdx: index('idx_refunds_order').on(table.orderId),
  statusIdx: index('idx_refunds_status').on(table.status),
}));

// Payment Recovery Attempts table
export const paymentRecoveryAttempts = pgTable('payment_recovery_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentIntentId: uuid('payment_intent_id').notNull().references(() => stripePaymentIntents.id),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  
  // Recovery details
  attemptNumber: integer('attempt_number').notNull(),
  strategy: varchar('strategy', { length: 50 }).notNull(), // retry_same_method, request_new_method, manual_intervention, email_reminder
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, in_progress, succeeded, failed, abandoned
  
  // Failure tracking
  failureReason: text('failure_reason'),
  errorDetails: jsonb('error_details'), // Store detailed error information
  
  // Scheduling
  nextAttemptAt: timestamp('next_attempt_at'),
  maxRetries: integer('max_retries').default(3),
  backoffMultiplier: integer('backoff_multiplier').default(2),
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  paymentIntentIdx: index('idx_recovery_attempts_payment_intent').on(table.paymentIntentId),
  orderIdx: index('idx_recovery_attempts_order').on(table.orderId),
  statusIdx: index('idx_recovery_attempts_status').on(table.status),
  nextAttemptIdx: index('idx_recovery_attempts_next_attempt').on(table.nextAttemptAt),
}));

// Payment Analytics table for tracking metrics
export const paymentAnalytics = pgTable('payment_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Date dimension
  date: timestamp('date').notNull(),
  period: varchar('period', { length: 20 }).notNull(), // daily, weekly, monthly
  
  // Revenue metrics (in cents)
  totalRevenue: integer('total_revenue').default(0),
  successfulPayments: integer('successful_payments').default(0),
  failedPayments: integer('failed_payments').default(0),
  refundedAmount: integer('refunded_amount').default(0),
  
  // Performance metrics
  averagePaymentTime: integer('average_payment_time'), // seconds
  successRate: integer('success_rate'), // percentage * 100
  
  // Recovery metrics
  recoveryAttempts: integer('recovery_attempts').default(0),
  successfulRecoveries: integer('successful_recoveries').default(0),
  
  // Method breakdown
  paymentMethodBreakdown: jsonb('payment_method_breakdown').$type<{
    stripe: number;
    manual: number;
    other: number;
  }>(),
  
  // Geographic data
  countryBreakdown: jsonb('country_breakdown'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dateIdx: index('idx_payment_analytics_date').on(table.date),
  periodIdx: index('idx_payment_analytics_period').on(table.period),
  uniqueDatePeriod: unique('unique_payment_analytics_date_period').on(table.date, table.period),
}));

// Enhanced invoices with revision tracking
export const invoiceRevisions = pgTable('invoice_revisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  
  // Revision details
  revisionNumber: integer('revision_number').notNull(),
  revisionType: varchar('revision_type', { length: 50 }).notNull(), // partial_refund, correction, reissue
  reason: text('reason'),
  
  // Previous and new amounts (in cents)
  previousTotal: integer('previous_total').notNull(),
  newTotal: integer('new_total').notNull(),
  adjustmentAmount: integer('adjustment_amount').notNull(), // difference
  
  // Line items changes
  changedItems: jsonb('changed_items').notNull(),
  
  // PDF storage
  fileUrl: varchar('file_url', { length: 500 }), // URL to revised invoice PDF
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
}, (table) => ({
  invoiceIdx: index('idx_invoice_revisions_invoice').on(table.invoiceId),
  revisionIdx: index('idx_invoice_revisions_revision').on(table.revisionNumber),
}));

// Type exports
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type StripePaymentIntent = typeof stripePaymentIntents.$inferSelect;
export type NewStripePaymentIntent = typeof stripePaymentIntents.$inferInsert;
export type StripeCustomer = typeof stripeCustomers.$inferSelect;
export type NewStripeCustomer = typeof stripeCustomers.$inferInsert;
export type StripeWebhook = typeof stripeWebhooks.$inferSelect;
export type NewStripeWebhook = typeof stripeWebhooks.$inferInsert;
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
export type PaymentRecoveryAttempt = typeof paymentRecoveryAttempts.$inferSelect;
export type NewPaymentRecoveryAttempt = typeof paymentRecoveryAttempts.$inferInsert;
export type PaymentAnalytics = typeof paymentAnalytics.$inferSelect;
export type NewPaymentAnalytics = typeof paymentAnalytics.$inferInsert;
export type InvoiceRevision = typeof invoiceRevisions.$inferSelect;
export type NewInvoiceRevision = typeof invoiceRevisions.$inferInsert;

// Payment audit logs table for comprehensive security and compliance tracking
export const paymentAuditLogs = pgTable('payment_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Event details
  eventType: varchar('event_type', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  
  // User context
  userId: uuid('user_id').references(() => users.id),
  userType: varchar('user_type', { length: 20 }),
  userEmail: varchar('user_email', { length: 255 }),
  
  // Request context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 255 }),
  
  // Action details
  action: varchar('action', { length: 100 }).notNull(),
  description: text('description').notNull(),
  
  // Data changes
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  metadata: jsonb('metadata'),
  
  // Financial data
  amountInvolved: varchar('amount_involved', { length: 20 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  
  // Status and outcomes
  success: boolean('success').notNull(),
  errorCode: varchar('error_code', { length: 100 }),
  errorMessage: text('error_message'),
  
  // Timing
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  processingTimeMs: varchar('processing_time_ms', { length: 20 }),
  
  // Security flags
  isSuspicious: boolean('is_suspicious').default(false),
  riskScore: varchar('risk_score', { length: 10 }),
  securityFlags: text('security_flags').array(),
  
  // Compliance
  pciCompliant: boolean('pci_compliant').default(true),
  gdprRelevant: boolean('gdpr_relevant').default(false),
  
}, (table) => ({
  eventTypeIdx: index('idx_audit_event_type').on(table.eventType),
  entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
  userIdx: index('idx_audit_user').on(table.userId),
  timestampIdx: index('idx_audit_timestamp').on(table.timestamp),
  suspiciousIdx: index('idx_audit_suspicious').on(table.isSuspicious),
  ipAddressIdx: index('idx_audit_ip').on(table.ipAddress),
}));

export type PaymentAuditLog = typeof paymentAuditLogs.$inferSelect;
export type NewPaymentAuditLog = typeof paymentAuditLogs.$inferInsert;