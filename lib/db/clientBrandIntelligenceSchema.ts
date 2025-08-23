import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clients, users } from './schema';

/**
 * Client Brand Intelligence - AI-powered brand research and brief generation
 * 
 * This system provides deep research and comprehensive brand briefs for clients
 * to improve content creation quality and authority.
 * 
 * Workflow:
 * 1. Deep Research Phase: AI analyzes client business and identifies gaps
 * 2. Client Input Phase: Client provides additional context (one-time)
 * 3. Brief Generation Phase: AI synthesizes research + client input into final brief
 */
export const clientBrandIntelligence = pgTable('client_brand_intelligence', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  
  // Deep Research Phase
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
  
  // Client Input Phase  
  clientInput: text('client_input'), // One-time client response to research gaps
  clientInputAt: timestamp('client_input_at'),
  
  // Brief Generation Phase
  briefSessionId: varchar('brief_session_id', { length: 255 }), // Second AI agent session for synthesis
  briefStatus: varchar('brief_status', { length: 50 }).notNull().default('idle'),
  // Status values: 'idle' | 'queued' | 'in_progress' | 'completed' | 'error'
  briefGeneratedAt: timestamp('brief_generated_at'),
  finalBrief: text('final_brief'), // AI-generated comprehensive brand brief
  
  // Metadata and Tracking
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  // Performance indexes
  clientIdIdx: index('client_brand_intelligence_client_id_idx').on(table.clientId),
  researchStatusIdx: index('client_brand_intelligence_research_status_idx').on(table.researchStatus),
  briefStatusIdx: index('client_brand_intelligence_brief_status_idx').on(table.briefStatus),
  createdByIdx: index('client_brand_intelligence_created_by_idx').on(table.createdBy),
  createdAtIdx: index('client_brand_intelligence_created_at_idx').on(table.createdAt),
  
  // Unique constraint: one brand intelligence per client
  // This is handled by the database UNIQUE constraint on client_id
}));

// Relations
export const clientBrandIntelligenceRelations = relations(clientBrandIntelligence, ({ one }) => ({
  client: one(clients, {
    fields: [clientBrandIntelligence.clientId],
    references: [clients.id],
  }),
  createdByUser: one(users, {
    fields: [clientBrandIntelligence.createdBy],
    references: [users.id],
  }),
}));

// Type exports for TypeScript
export type ClientBrandIntelligence = typeof clientBrandIntelligence.$inferSelect;
export type NewClientBrandIntelligence = typeof clientBrandIntelligence.$inferInsert;

// Helper type for the research output structure
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

// Status type definitions for better type safety
export type ResearchStatus = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error';
export type BriefStatus = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error';