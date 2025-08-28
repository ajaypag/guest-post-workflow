import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { targetPages } from './schema';
import { users } from './schema';

/**
 * Audit log table for tracking all target page intelligence generation attempts
 * Preserves complete history of all research and brief generation attempts
 */
export const intelligenceGenerationLogs = pgTable('intelligence_generation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // What was attempted
  targetPageId: uuid('target_page_id').notNull().references(() => targetPages.id, { onDelete: 'cascade' }),
  sessionType: varchar('session_type', { length: 50 }).notNull(), // 'research' | 'brief' | 'cancel'
  openaiSessionId: text('openai_session_id'), // The OpenAI session ID if started
  
  // When it happened
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  durationSeconds: integer('duration_seconds'),
  
  // What happened
  status: varchar('status', { length: 50 }).notNull(), // 'started' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'auto_recovered'
  errorMessage: text('error_message'),
  errorDetails: jsonb('error_details'),
  
  // Who did it
  initiatedBy: uuid('initiated_by').references(() => users.id, { onDelete: 'set null' }),
  userType: varchar('user_type', { length: 20 }), // 'internal' | 'account'
  
  // What was produced (if successful)
  outputSize: integer('output_size'), // Size of research/brief output in characters
  tokensUsed: integer('tokens_used'), // If we track token usage
  
  // Additional context
  metadata: jsonb('metadata'), // Additional context like recovery info, retry count, etc
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Index for querying by target page
    targetPageIdx: index('idx_target_page_logs').on(table.targetPageId, table.createdAt),
    // Index for querying by status
    statusIdx: index('idx_status_logs').on(table.status, table.createdAt),
    // Index for finding stuck sessions
    inProgressIdx: index('idx_in_progress_logs').on(table.status, table.startedAt),
  };
});

// Relations
export const intelligenceGenerationLogsRelations = relations(intelligenceGenerationLogs, ({ one }) => ({
  targetPage: one(targetPages, {
    fields: [intelligenceGenerationLogs.targetPageId],
    references: [targetPages.id],
  }),
  user: one(users, {
    fields: [intelligenceGenerationLogs.initiatedBy],
    references: [users.id],
  }),
}));

// Types
export type IntelligenceGenerationLog = typeof intelligenceGenerationLogs.$inferSelect;
export type NewIntelligenceGenerationLog = typeof intelligenceGenerationLogs.$inferInsert;