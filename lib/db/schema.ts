import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'), // 'user' | 'admin'
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Clients table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  website: varchar('website', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Client assignments (which users can access which clients)
export const clientAssignments = pgTable('client_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Target pages for clients
export const targetPages = pgTable('target_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'completed' | 'inactive'
  addedAt: timestamp('added_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Workflows table
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientUrl: varchar('client_url', { length: 255 }).notNull(),
  targetDomain: varchar('target_domain', { length: 255 }),
  currentStep: integer('current_step').notNull().default(0),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdByName: varchar('created_by_name', { length: 255 }).notNull(),
  createdByEmail: varchar('created_by_email', { length: 255 }),
  clientId: uuid('client_id').references(() => clients.id), // Optional link to client
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Workflow steps table
export const workflowSteps = pgTable('workflow_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'in_progress' | 'completed' | 'skipped'
  inputs: jsonb('inputs').notNull().default({}),
  outputs: jsonb('outputs').notNull().default({}),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
    fields: [workflows.createdBy],
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