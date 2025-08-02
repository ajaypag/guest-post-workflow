import { pgTable, uuid, varchar, text, timestamp, boolean, integer, real, jsonb, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - INTERNAL STAFF ONLY
// Note: accounts and publishers have separate tables with their own authentication
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Remove defaultRandom() to handle in application code
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'), // 'user' | 'admin'
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull(), // Remove defaultNow() to handle in application code
  updatedAt: timestamp('updated_at').notNull(), // Remove defaultNow() to handle in application code
});

// Invitations table for invite-only system
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  targetTable: varchar('target_table', { length: 20 }).notNull(), // 'users' | 'accounts' | 'publishers'
  role: varchar('role', { length: 50 }).notNull(), // 'user' | 'admin' (for users table only)
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  revokedAt: timestamp('revoked_at'),
  createdByEmail: varchar('created_by_email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// User client access table for multi-client system
export const userClientAccess = pgTable('user_client_access', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  accessLevel: varchar('access_level', { length: 50 }).notNull().default('read'), // 'read' | 'write' | 'admin'
  grantedAt: timestamp('granted_at').notNull(),
  grantedBy: uuid('granted_by').notNull().references(() => users.id),
  revokedAt: timestamp('revoked_at'),
  revokedBy: uuid('revoked_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// User website access table for publisher users
export const userWebsiteAccess = pgTable('user_website_access', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  websiteId: uuid('website_id').notNull(), // References websites table (will be created later)
  accessLevel: varchar('access_level', { length: 50 }).notNull().default('read'), // 'read' | 'write' | 'admin'
  grantedAt: timestamp('granted_at').notNull(),
  grantedBy: uuid('granted_by').notNull().references(() => users.id),
  revokedAt: timestamp('revoked_at'),
  revokedBy: uuid('revoked_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull(),
});

// Clients table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey(), // Remove defaultRandom() to handle in application code
  name: varchar('name', { length: 255 }).notNull(),
  website: varchar('website', { length: 255 }).notNull(),
  description: text('description').default(''),
  clientType: varchar('client_type', { length: 50 }).default('client'), // 'prospect' | 'client'
  createdBy: uuid('created_by').notNull().references(() => users.id),
  accountId: uuid('account_id'), // Link to account that owns this client
  shareToken: varchar('share_token', { length: 255 }).unique(), // For public claim links
  invitationId: uuid('invitation_id'), // Link to invitation if created via invitation
  convertedFromProspectAt: timestamp('converted_from_prospect_at'),
  conversionNotes: text('conversion_notes'),
  defaultRequirements: text('default_requirements').default('{}'), // JSONB column for order-centric architecture
  archivedAt: timestamp('archived_at'), // Soft delete timestamp
  archivedBy: uuid('archived_by').references(() => users.id), // Who archived the client
  archiveReason: text('archive_reason'), // Reason for archiving (audit trail)
  createdAt: timestamp('created_at').notNull(), // Remove defaultNow() to handle in application code
  updatedAt: timestamp('updated_at').notNull(), // Remove defaultNow() to handle in application code
});

// Client assignments (which users can access which clients)
export const clientAssignments = pgTable('client_assignments', {
  id: uuid('id').primaryKey(), // Remove defaultRandom() to handle in application code
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull(), // Remove defaultNow() to handle in application code
});

// Target pages for clients
export const targetPages = pgTable('target_pages', {
  id: uuid('id').primaryKey(), // Remove defaultRandom() to handle in application code
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  normalizedUrl: varchar('normalized_url', { length: 500 }), // Canonical URL for duplicate checking and AI matching
  domain: varchar('domain', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'completed' | 'inactive'
  keywords: text('keywords'), // Comma-separated list of AI-generated keywords
  description: text('description'), // AI-generated description of the URL content
  addedAt: timestamp('added_at').notNull(), // Remove defaultNow() to handle in application code
  completedAt: timestamp('completed_at'),
});


// Workflows table - matches actual database structure
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  clientId: uuid('client_id').references(() => clients.id),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  content: jsonb('content'), // Stores the complete GuestPostWorkflow as JSON
  targetPages: jsonb('target_pages'), // Stores target pages as JSON
  orderItemId: uuid('order_item_id'), // Link to order system
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Workflow steps table
export const workflowSteps = pgTable('workflow_steps', {
  id: uuid('id').primaryKey(), // Remove defaultRandom() to handle in application code
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'in_progress' | 'completed' | 'skipped'
  inputs: jsonb('inputs').notNull().default({}),
  outputs: jsonb('outputs').notNull().default({}),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull(), // Remove defaultNow() to handle in application code
  updatedAt: timestamp('updated_at').notNull(), // Remove defaultNow() to handle in application code
});

// Article sections for agentic workflow
export const articleSections = pgTable('article_sections', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1), // Version number for each generation run
  sectionNumber: integer('section_number').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  wordCount: integer('word_count').default(0),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'generating' | 'completed' | 'error'
  agentConversationId: varchar('agent_conversation_id', { length: 255 }),
  generationMetadata: jsonb('generation_metadata'), // Stores agent context, prompts, etc
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Agent sessions for tracking agentic workflows
export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1), // Version number for each generation run
  stepId: varchar('step_id', { length: 100 }).notNull(), // e.g., 'article-draft'
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'planning' | 'writing' | 'completed' | 'error'
  agentId: varchar('agent_id', { length: 255 }),
  conversationId: varchar('conversation_id', { length: 255 }),
  totalSections: integer('total_sections').default(0),
  completedSections: integer('completed_sections').default(0),
  targetWordCount: integer('target_word_count'),
  currentWordCount: integer('current_word_count').default(0),
  outline: text('outline'), // The article outline from Deep Research
  sessionMetadata: jsonb('session_metadata'), // Stores context, style rules, etc
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Audit sessions for tracking semantic SEO audit workflows
export const auditSessions = pgTable('audit_sessions', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1), // Version number for each audit run
  stepId: varchar('step_id', { length: 100 }).notNull(), // e.g., 'content-audit'
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'auditing' | 'completed' | 'error'
  totalSections: integer('total_sections').default(0),
  completedSections: integer('completed_sections').default(0),
  totalCitationsUsed: integer('total_citations_used').default(0), // Track citations across sections
  originalArticle: text('original_article'), // The article being audited
  researchOutline: text('research_outline'), // Research data for context
  auditMetadata: jsonb('audit_metadata'), // Stores editing patterns, context, etc
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Audit sections for tracking section-by-section semantic SEO audits
export const auditSections = pgTable('audit_sections', {
  id: uuid('id').primaryKey(),
  auditSessionId: uuid('audit_session_id').notNull().references(() => auditSessions.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1), // Version number for each audit run
  sectionNumber: integer('section_number').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  originalContent: text('original_content'), // Original section content
  auditedContent: text('audited_content'), // SEO-optimized content
  strengths: text('strengths'), // Identified strengths
  weaknesses: text('weaknesses'), // Identified weaknesses
  editingPattern: varchar('editing_pattern', { length: 100 }), // 'bullets', 'prose', 'citations', etc.
  citationsAdded: integer('citations_added').default(0), // Citations added in this section
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'auditing' | 'completed' | 'error'
  auditMetadata: jsonb('audit_metadata'), // Section-specific audit context
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Polish sessions for tracking final polish workflows
export const polishSessions = pgTable('polish_sessions', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1), // Version number for each polish run
  stepId: varchar('step_id', { length: 100 }).notNull().default('final-polish'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'polishing' | 'completed' | 'error'
  totalSections: integer('total_sections').default(0),
  completedSections: integer('completed_sections').default(0),
  originalArticle: text('original_article'), // SEO-optimized article input
  researchContext: text('research_context'), // Research data for context
  brandConflictsFound: integer('brand_conflicts_found').default(0), // Track brand vs semantic conflicts
  polishMetadata: jsonb('polish_metadata'), // Stores brand insights, patterns, etc
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Polish sections for tracking section-by-section final polish
export const polishSections = pgTable('polish_sections', {
  id: uuid('id').primaryKey(),
  polishSessionId: uuid('polish_session_id').notNull().references(() => polishSessions.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  sectionNumber: integer('section_number').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  originalContent: text('original_content'), // SEO-optimized section content
  polishedContent: text('polished_content'), // Final polished content
  strengths: text('strengths'), // Brand adherence strengths
  weaknesses: text('weaknesses'), // Areas for improvement
  brandConflicts: text('brand_conflicts'), // Specific brand vs semantic conflicts identified
  polishApproach: text('polish_approach'), // 'engagement-focused', 'clarity-focused', 'balanced', etc. - Changed to TEXT for AI content
  engagementScore: real('engagement_score'), // 1-10 engagement level (decimal allowed)
  clarityScore: real('clarity_score'), // 1-10 clarity/directness level (decimal allowed)
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  polishMetadata: jsonb('polish_metadata'), // Section-specific context
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Formatting QA sessions for tracking automated formatting checks
export const formattingQaSessions = pgTable('formatting_qa_sessions', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1), // Version number for each QA run
  stepId: varchar('step_id', { length: 100 }).notNull().default('formatting-qa'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'checking' | 'completed' | 'error'
  totalChecks: integer('total_checks').default(0),
  passedChecks: integer('passed_checks').default(0),
  failedChecks: integer('failed_checks').default(0),
  originalArticle: text('original_article'), // Article being checked
  cleanedArticle: text('cleaned_article'), // AI-cleaned version of the article
  fixesApplied: jsonb('fixes_applied'), // Track which fixes were applied
  qaMetadata: jsonb('qa_metadata'), // Stores check configuration, context, etc
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Individual formatting checks for detailed QA results
export const formattingQaChecks = pgTable('formatting_qa_checks', {
  id: uuid('id').primaryKey(),
  qaSessionId: uuid('qa_session_id').notNull().references(() => formattingQaSessions.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  checkNumber: integer('check_number').notNull(),
  checkType: varchar('check_type', { length: 255 }).notNull(), // 'header_hierarchy', 'line_breaks', etc.
  checkDescription: text('check_description'), // What this check validates
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'passed' | 'failed' | 'warning'
  issuesFound: text('issues_found'), // Detailed issues description
  locationDetails: text('location_details'), // Where in article issues occur
  confidenceScore: integer('confidence_score'), // 1-10 confidence in check result
  fixSuggestions: text('fix_suggestions'), // How to fix the issues
  checkMetadata: jsonb('check_metadata'), // Check-specific data
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  workflows: many(workflows),
  clientAssignments: many(clientAssignments),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  creator: one(users, {
    fields: [clients.createdBy],
    references: [users.id],
  }),
  targetPages: many(targetPages),
  workflows: many(workflows),
  assignments: many(clientAssignments),
}));

export const clientAssignmentsRelations = relations(clientAssignments, ({ one }) => ({
  client: one(clients, {
    fields: [clientAssignments.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [clientAssignments.userId],
    references: [users.id],
  }),
}));

export const targetPagesRelations = relations(targetPages, ({ one }) => ({
  client: one(clients, {
    fields: [targetPages.clientId],
    references: [clients.id],
  }),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  creator: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [workflows.clientId],
    references: [clients.id],
  }),
  steps: many(workflowSteps),
  articleSections: many(articleSections),
  linkOrchestrationSessions: many(linkOrchestrationSessions),
  agentSessions: many(agentSessions),
  auditSessions: many(auditSessions),
  auditSections: many(auditSections),
  polishSessions: many(polishSessions),
  polishSections: many(polishSections),
  formattingQaSessions: many(formattingQaSessions),
  formattingQaChecks: many(formattingQaChecks),
  outlineSessions: many(outlineSessions),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
}));

export const articleSectionsRelations = relations(articleSections, ({ one }) => ({
  workflow: one(workflows, {
    fields: [articleSections.workflowId],
    references: [workflows.id],
  }),
}));

export const agentSessionsRelations = relations(agentSessions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [agentSessions.workflowId],
    references: [workflows.id],
  }),
}));

export const auditSessionsRelations = relations(auditSessions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [auditSessions.workflowId],
    references: [workflows.id],
  }),
  auditSections: many(auditSections),
}));

export const auditSectionsRelations = relations(auditSections, ({ one }) => ({
  auditSession: one(auditSessions, {
    fields: [auditSections.auditSessionId],
    references: [auditSessions.id],
  }),
  workflow: one(workflows, {
    fields: [auditSections.workflowId],
    references: [workflows.id],
  }),
}));

export const polishSessionsRelations = relations(polishSessions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [polishSessions.workflowId],
    references: [workflows.id],
  }),
  polishSections: many(polishSections),
}));

export const polishSectionsRelations = relations(polishSections, ({ one }) => ({
  polishSession: one(polishSessions, {
    fields: [polishSections.polishSessionId],
    references: [polishSessions.id],
  }),
  workflow: one(workflows, {
    fields: [polishSections.workflowId],
    references: [workflows.id],
  }),
}));

export const formattingQaSessionsRelations = relations(formattingQaSessions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [formattingQaSessions.workflowId],
    references: [workflows.id],
  }),
  formattingQaChecks: many(formattingQaChecks),
}));

export const formattingQaChecksRelations = relations(formattingQaChecks, ({ one }) => ({
  qaSession: one(formattingQaSessions, {
    fields: [formattingQaChecks.qaSessionId],
    references: [formattingQaSessions.id],
  }),
  workflow: one(workflows, {
    fields: [formattingQaChecks.workflowId],
    references: [workflows.id],
  }),
}));

// Re-export order schema tables
export { 
  orders,
  orderItems,
  orderShareTokens,
  orderStatusHistory,
  domainSuggestions,
  accountOrderAccess,
  pricingRules,
  ordersRelations,
  orderItemsRelations
} from './orderSchema';

// Re-export website schema tables  
export { 
  websites,
  websiteContacts,
  websiteQualifications,
  projectWebsites,
  workflowWebsites,
  websiteSyncLogs,
  websitesRelations,
  websiteContactsRelations,
  websiteQualificationsRelations,
  projectWebsitesRelations,
  workflowWebsitesRelations,
  websiteSyncLogsRelations
} from './websiteSchema';

// Re-export bulk analysis schema tables
export { 
  bulkAnalysisDomains,
  bulkAnalysisProjects,
  bulkAnalysisDomainsRelations,
  bulkAnalysisProjectsRelations
} from './bulkAnalysisSchema';

// Re-export account schema tables
export {
  accounts,
  publishers,
  publisherWebsites,
  accountsRelations
} from './accountSchema';

// Re-export order group schema tables
export {
  orderGroups,
  orderSiteSelections,
  orderGroupsRelations,
  orderSiteSelectionsRelations
} from './orderGroupSchema';

// Outline sessions for tracking deep research outline generation with clarifications
export const outlineSessions = pgTable('outline_sessions', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1), // Version number for each outline generation
  stepId: varchar('step_id', { length: 100 }).notNull().default('deep-research'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'triaging' | 'clarifying' | 'building' | 'researching' | 'completed' | 'error'
  outlinePrompt: text('outline_prompt'), // Initial prompt from topic generation
  clarificationQuestions: jsonb('clarification_questions'), // Questions from clarifying agent
  clarificationAnswers: text('clarification_answers'), // User's answers
  agentState: jsonb('agent_state'), // Serialized agent state for resumption
  researchInstructions: text('research_instructions'), // Instructions built by instruction agent
  finalOutline: text('final_outline'), // Complete research outline
  citations: jsonb('citations'), // Extracted citations/sources
  sessionMetadata: jsonb('session_metadata'), // Additional context like keyword, title, etc.
  backgroundResponseId: varchar('background_response_id', { length: 255 }), // OpenAI background response ID
  pollingAttempts: integer('polling_attempts').default(0), // Number of times we've polled
  lastPolledAt: timestamp('last_polled_at'), // Last time we checked the status
  isActive: boolean('is_active').default(false), // Track if this session is currently active
  // Streaming support fields
  lastSequenceNumber: integer('last_sequence_number').default(0), // Track sequence for SSE
  connectionStatus: varchar('connection_status', { length: 50 }), // 'preparing' | 'connected' | 'disconnected' | 'failed' | 'completed'
  streamStartedAt: timestamp('stream_started_at'), // When streaming actually began
  partialContent: text('partial_content'), // Store streaming content as it arrives
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const outlineSessionsRelations = relations(outlineSessions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [outlineSessions.workflowId],
    references: [workflows.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type TargetPage = typeof targetPages.$inferSelect;
export type NewTargetPage = typeof targetPages.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type NewWorkflowStep = typeof workflowSteps.$inferInsert;
export type ArticleSection = typeof articleSections.$inferSelect;
export type NewArticleSection = typeof articleSections.$inferInsert;
export type AgentSession = typeof agentSessions.$inferSelect;
export type NewAgentSession = typeof agentSessions.$inferInsert;
export type AuditSession = typeof auditSessions.$inferSelect;
export type NewAuditSession = typeof auditSessions.$inferInsert;
export type AuditSection = typeof auditSections.$inferSelect;
export type NewAuditSection = typeof auditSections.$inferInsert;
export type PolishSession = typeof polishSessions.$inferSelect;
export type NewPolishSession = typeof polishSessions.$inferInsert;
export type PolishSection = typeof polishSections.$inferSelect;
export type NewPolishSection = typeof polishSections.$inferInsert;
export type FormattingQaSession = typeof formattingQaSessions.$inferSelect;
export type NewFormattingQaSession = typeof formattingQaSessions.$inferInsert;
export type FormattingQaCheck = typeof formattingQaChecks.$inferSelect;
export type NewFormattingQaCheck = typeof formattingQaChecks.$inferInsert;
export type OutlineSession = typeof outlineSessions.$inferSelect;
export type NewOutlineSession = typeof outlineSessions.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type UserClientAccess = typeof userClientAccess.$inferSelect;
export type NewUserClientAccess = typeof userClientAccess.$inferInsert;
export type UserWebsiteAccess = typeof userWebsiteAccess.$inferSelect;
export type NewUserWebsiteAccess = typeof userWebsiteAccess.$inferInsert;

// V2 Agent Sessions for LLM Orchestration
export const v2AgentSessions = pgTable('v2_agent_sessions', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull(),
  version: integer('version').notNull(),
  stepId: varchar('step_id', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // initializing | orchestrating | writing | completed | failed
  outline: text('outline'), // Use TEXT for long content (learning from CLAUDE.md)
  totalSections: integer('total_sections'),
  completedSections: integer('completed_sections'),
  currentWordCount: integer('current_word_count'),
  totalWordCount: integer('total_word_count'),
  finalArticle: text('final_article'), // TEXT for AI-generated content
  sessionMetadata: jsonb('session_metadata'),
  errorMessage: text('error_message'), // TEXT for error messages
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const v2AgentSessionsRelations = relations(v2AgentSessions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [v2AgentSessions.workflowId],
    references: [workflows.id],
  }),
}));

export type V2AgentSession = typeof v2AgentSessions.$inferSelect;
export type NewV2AgentSession = typeof v2AgentSessions.$inferInsert;

// Link Orchestration Sessions
export const linkOrchestrationSessions = pgTable('link_orchestration_sessions', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id),
  version: integer('version').notNull().default(1),
  status: varchar('status', { length: 50 }).notNull(), // 'initializing', 'phase1', 'phase2', 'phase3', 'completed', 'failed'
  
  // Phase tracking
  currentPhase: integer('current_phase').default(1),
  phase1Start: timestamp('phase1_start'),
  phase1Complete: timestamp('phase1_complete'),
  phase2Start: timestamp('phase2_start'),
  phase2Complete: timestamp('phase2_complete'),
  phase3Start: timestamp('phase3_start'),
  phase3Complete: timestamp('phase3_complete'),
  
  // Article versions
  originalArticle: text('original_article').notNull(),
  articleAfterPhase1: text('article_after_phase1'),
  articleAfterPhase2: text('article_after_phase2'),
  finalArticle: text('final_article'),
  
  // Input parameters
  targetDomain: text('target_domain').notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientUrl: text('client_url').notNull(),
  anchorText: varchar('anchor_text', { length: 255 }),
  guestPostSite: text('guest_post_site').notNull(),
  targetKeyword: varchar('target_keyword', { length: 255 }).notNull(),
  
  // Results stored as JSONB
  phase1Results: jsonb('phase1_results'),
  phase2Results: jsonb('phase2_results'),
  phase3Results: jsonb('phase3_results'),
  
  // Error tracking
  errorMessage: text('error_message'),
  errorDetails: jsonb('error_details'),
  
  // Timestamps
  startedAt: timestamp('started_at').default(new Date()),
  completedAt: timestamp('completed_at'),
  failedAt: timestamp('failed_at'),
  
  createdAt: timestamp('created_at').default(new Date()),
  updatedAt: timestamp('updated_at').default(new Date()),
});

export const linkOrchestrationSessionsRelations = relations(linkOrchestrationSessions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [linkOrchestrationSessions.workflowId],
    references: [workflows.id],
  }),
}));

export type LinkOrchestrationSession = typeof linkOrchestrationSessions.$inferSelect;
export type NewLinkOrchestrationSession = typeof linkOrchestrationSessions.$inferInsert;