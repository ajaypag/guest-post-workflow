import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { targetPages, clients, users } from './schema';

/**
 * Target Page Intelligence - AI-powered research and brief generation for specific target pages
 * 
 * This system provides deep research and comprehensive briefs for specific product/service pages
 * to improve content creation quality and relevance for individual target URLs.
 * 
 * Workflow (identical to brand intelligence):
 * 1. Deep Research Phase: AI analyzes specific target page and identifies gaps
 * 2. Client Input Phase: Client provides additional context (one-time)
 * 3. Brief Generation Phase: AI synthesizes research + client input into final brief
 */
export const targetPageIntelligence = pgTable('target_page_intelligence', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  targetPageId: uuid('target_page_id').notNull().references(() => targetPages.id, { onDelete: 'cascade' }),
  
  // Deep Research Phase (identical to brand intelligence)
  researchSessionId: varchar('research_session_id', { length: 255 }), // OpenAI Deep Research session ID
  researchStatus: varchar('research_status', { length: 50 }).notNull().default('idle'),
  // Status values: 'idle' | 'queued' | 'in_progress' | 'completed' | 'error'
  researchStartedAt: timestamp('research_started_at'),
  researchCompletedAt: timestamp('research_completed_at'),
  researchOutput: jsonb('research_output').$type<{
    analysis: string;
    gaps: Array<{
      category: string;
      question: string;
      importance: 'high' | 'medium' | 'low';
    }>;
    sources: Array<{
      type: 'url' | 'document' | 'analysis';
      value: string;
      description?: string;
    }>;
    metadata: {
      researchDuration: number; // seconds
      tokensUsed: number;
      modelUsed: string;
      completionReason: string;
    };
  }>(),
  
  // Client Input Phase (identical to brand intelligence)
  clientInput: text('client_input'), // One-time client response to research gaps
  clientInputAt: timestamp('client_input_at'),
  
  // Brief Generation Phase (identical to brand intelligence)
  briefSessionId: varchar('brief_session_id', { length: 255 }), // Second AI agent session for synthesis
  briefStatus: varchar('brief_status', { length: 50 }).notNull().default('idle'),
  // Status values: 'idle' | 'queued' | 'in_progress' | 'completed' | 'error'
  briefGeneratedAt: timestamp('brief_generated_at'),
  finalBrief: text('final_brief'), // AI-generated comprehensive target page brief
  
  // Session metadata (for email tokens, etc.) - identical to brand intelligence
  metadata: jsonb('metadata').$type<{
    answerToken?: string;
    questionsSentAt?: string;
    answersSubmittedAt?: string;
    clientAnswers?: any;
    editedResearch?: string; // Support editing like brand intelligence
    additionalInfo?: string;
  }>(),
  
  // Metadata and Tracking (identical to brand intelligence)
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  // Performance indexes (matching brand intelligence pattern)
  clientIdIdx: index('target_page_intelligence_client_id_idx').on(table.clientId),
  targetPageIdIdx: index('target_page_intelligence_target_page_id_idx').on(table.targetPageId),
  researchStatusIdx: index('target_page_intelligence_research_status_idx').on(table.researchStatus),
  briefStatusIdx: index('target_page_intelligence_brief_status_idx').on(table.briefStatus),
  createdByIdx: index('target_page_intelligence_created_by_idx').on(table.createdBy),
  createdAtIdx: index('target_page_intelligence_created_at_idx').on(table.createdAt),
  
  // Unique constraint: one intelligence per target page
  // This is handled by the database UNIQUE constraint on target_page_id
}));

// Relations
export const targetPageIntelligenceRelations = relations(targetPageIntelligence, ({ one }) => ({
  client: one(clients, {
    fields: [targetPageIntelligence.clientId],
    references: [clients.id],
  }),
  targetPage: one(targetPages, {
    fields: [targetPageIntelligence.targetPageId],
    references: [targetPages.id],
  }),
  createdByUser: one(users, {
    fields: [targetPageIntelligence.createdBy],
    references: [users.id],
  }),
}));

// Type exports for TypeScript (identical structure to brand intelligence)
export type TargetPageIntelligence = typeof targetPageIntelligence.$inferSelect;
export type NewTargetPageIntelligence = typeof targetPageIntelligence.$inferInsert;

// Helper type for the research output structure (identical to brand intelligence)
export type ResearchOutput = {
  analysis: string;
  gaps: Array<{
    category: string;
    question: string;
    importance: 'high' | 'medium' | 'low';
  }>;
  sources: Array<{
    type: 'url' | 'document' | 'analysis';
    value: string;
    description?: string;
  }>;
  metadata: {
    researchDuration: number; // seconds
    tokensUsed: number;
    modelUsed: string;
    completionReason: string;
  };
};

// Status type definitions for better type safety (identical to brand intelligence)
export type ResearchStatus = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error';
export type BriefStatus = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error';