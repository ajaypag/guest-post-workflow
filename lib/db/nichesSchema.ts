import { pgTable, varchar, timestamp, serial, uuid, integer, text, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Niches table to store unique niches across the system
export const niches = pgTable('niches', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  source: varchar('source', { length: 50 }).default('manual'), // 'manual', 'manyreach_ai', 'airtable', etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Suggested tags table for tracking O3-suggested niches/categories
export const suggestedTags = pgTable('suggested_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  tagName: varchar('tag_name', { length: 255 }).notNull(),
  tagType: varchar('tag_type', { length: 20 }).notNull(), // 'niche' or 'category'
  websiteCount: integer('website_count').default(1),
  exampleWebsites: text('example_websites').array(),
  firstSuggestedAt: timestamp('first_suggested_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  approved: boolean('approved').default(false),
  approvedAt: timestamp('approved_at'),
  approvedBy: varchar('approved_by', { length: 255 })
});

// Type inference
export type Niche = typeof niches.$inferSelect;
export type NewNiche = typeof niches.$inferInsert;
export type SuggestedTag = typeof suggestedTags.$inferSelect;
export type NewSuggestedTag = typeof suggestedTags.$inferInsert;