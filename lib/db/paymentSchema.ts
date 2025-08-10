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