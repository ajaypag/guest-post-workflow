import { pgTable, varchar, timestamp, serial } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Niches table to store unique niches across the system
export const niches = pgTable('niches', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  source: varchar('source', { length: 50 }).default('manual'), // 'manual', 'manyreach_ai', 'airtable', etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type inference
export type Niche = typeof niches.$inferSelect;
export type NewNiche = typeof niches.$inferInsert;