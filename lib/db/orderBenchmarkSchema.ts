import { pgTable, uuid, timestamp, varchar, text, index, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './orderSchema';
import { orderGroups } from './orderGroupSchema';
import { users } from './schema';

/**
 * Order Benchmarks - Captures the "wishlist" state at order confirmation
 * This represents what the client originally requested and serves as the 
 * benchmark for tracking actual delivery vs expectations
 */
export const orderBenchmarks = pgTable('order_benchmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Link to order
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Version control
  version: integer('version').notNull().default(1),
  isLatest: boolean('is_latest').notNull().default(true),
  
  // Snapshot timing
  capturedAt: timestamp('captured_at').notNull().defaultNow(),
  capturedBy: uuid('captured_by').notNull().references(() => users.id),
  captureReason: varchar('capture_reason', { length: 50 }).notNull(),
  // Reasons: 'order_confirmed', 'manual_update', 'client_revision'
  
  // The benchmark data - complete snapshot of what was requested
  benchmarkData: jsonb('benchmark_data').notNull().$type<{
    // Order-level data
    orderTotal: number;
    serviceFee: number;
    
    // Per-client groups
    clientGroups: Array<{
      clientId: string;
      clientName: string;
      linkCount: number;
      
      // Per target page within client
      targetPages: Array<{
        url: string;
        pageId?: string;
        requestedLinks: number;
        
        // Requested domains for this target
        requestedDomains: Array<{
          domainId: string;
          domain: string;
          wholesalePrice: number;
          retailPrice: number;
          anchorText?: string;
          specialInstructions?: string;
          metrics?: {
            dr?: number;
            traffic?: number;
            qualityScore?: number;
          };
        }>;
      }>;
    }>;
    
    // Summary statistics
    totalRequestedLinks: number;
    totalClients: number;
    totalTargetPages: number;
    totalUniqueDomains: number;
  }>(),
  
  // Notes about this benchmark version
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('idx_benchmark_order').on(table.orderId),
  latestIdx: index('idx_benchmark_latest').on(table.orderId, table.isLatest),
  versionIdx: index('idx_benchmark_version').on(table.orderId, table.version),
}));

/**
 * Benchmark Comparisons - Track actual delivery vs benchmark
 * Updated periodically to show progress
 */
export const benchmarkComparisons = pgTable('benchmark_comparisons', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Links
  benchmarkId: uuid('benchmark_id').notNull().references(() => orderBenchmarks.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Comparison timing
  comparedAt: timestamp('compared_at').notNull().defaultNow(),
  comparedBy: uuid('compared_by').references(() => users.id),
  
  // Comparison results
  comparisonData: jsonb('comparison_data').notNull().$type<{
    // Overall completion
    requestedLinks: number;
    deliveredLinks: number;
    completionPercentage: number;
    
    // Financial
    expectedRevenue: number;
    actualRevenue: number;
    revenueDifference: number;
    
    // Per-client analysis
    clientAnalysis: Array<{
      clientId: string;
      clientName: string;
      
      requested: number;
      delivered: number;
      inProgress: number;
      
      // Target page level
      targetPageAnalysis: Array<{
        url: string;
        requested: number;
        delivered: number;
        
        // What changed
        substitutions: Array<{
          requestedDomain: string;
          deliveredDomain: string;
          reason: string;
        }>;
        
        missing: Array<{
          domain: string;
          reason: string; // 'unavailable', 'quality_issue', 'price_change', etc.
        }>;
        
        extras: Array<{
          domain: string;
          reason: string; // 'better_quality', 'client_requested', etc.
        }>;
      }>;
    }>;
    
    // Issues and notes
    issues: Array<{
      type: 'missing' | 'substitution' | 'delay' | 'quality';
      description: string;
      affectedItems: string[];
    }>;
  }>(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  benchmarkIdx: index('idx_comparison_benchmark').on(table.benchmarkId),
  orderIdx: index('idx_comparison_order').on(table.orderId),
  latestIdx: index('idx_comparison_latest').on(table.orderId, table.comparedAt),
}));

// Type exports
export type OrderBenchmark = typeof orderBenchmarks.$inferSelect;
export type NewOrderBenchmark = typeof orderBenchmarks.$inferInsert;
export type BenchmarkComparison = typeof benchmarkComparisons.$inferSelect;
export type NewBenchmarkComparison = typeof benchmarkComparisons.$inferInsert;

// Relations
export const orderBenchmarksRelations = relations(orderBenchmarks, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderBenchmarks.orderId],
    references: [orders.id],
  }),
  capturedByUser: one(users, {
    fields: [orderBenchmarks.capturedBy],
    references: [users.id],
  }),
  comparisons: many(benchmarkComparisons),
}));

export const benchmarkComparisonsRelations = relations(benchmarkComparisons, ({ one }) => ({
  benchmark: one(orderBenchmarks, {
    fields: [benchmarkComparisons.benchmarkId],
    references: [orderBenchmarks.id],
  }),
  order: one(orders, {
    fields: [benchmarkComparisons.orderId],
    references: [orders.id],
  }),
  comparedByUser: one(users, {
    fields: [benchmarkComparisons.comparedBy],
    references: [users.id],
  }),
}));