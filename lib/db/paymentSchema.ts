import { pgTable, uuid, varchar, integer, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
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
});

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

// Type exports
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;