import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
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

// Clients table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey(), // Remove defaultRandom() to handle in application code
  name: varchar('name', { length: 255 }).notNull(),
  website: varchar('website', { length: 255 }).notNull(),
  description: text('description').default(''),
  createdBy: uuid('created_by').notNull().references(() => users.id),
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
  domain: varchar('domain', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'completed' | 'inactive'
  keywords: text('keywords'), // Comma-separated list of AI-generated keywords
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
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
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