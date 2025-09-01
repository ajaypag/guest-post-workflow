import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { emailProcessingLogs } from './emailProcessingSchema';
import { publishers } from './accountSchema';
import { websites } from './websiteSchema';
import { users } from './schema';

export const publisherDrafts = pgTable('publisher_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  emailLogId: uuid('email_log_id').references(() => emailProcessingLogs.id, { onDelete: 'cascade' }),
  
  // Extracted data (stored as JSON for flexibility)
  parsedData: text('parsed_data').notNull().default('{}'),
  
  // Draft management
  status: varchar('status', { length: 50 }).default('pending'), // pending, reviewing, approved, rejected
  editedData: text('edited_data'), // User's edits overlay on parsed_data
  
  // Review tracking
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  
  // If approved, link to created records
  publisherId: uuid('publisher_id').references(() => publishers.id),
  websiteId: uuid('website_id').references(() => websites.id),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Relations
export const publisherDraftsRelations = relations(publisherDrafts, ({ one }) => ({
  emailLog: one(emailProcessingLogs, {
    fields: [publisherDrafts.emailLogId],
    references: [emailProcessingLogs.id],
  }),
  reviewer: one(users, {
    fields: [publisherDrafts.reviewedBy],
    references: [users.id],
  }),
  publisher: one(publishers, {
    fields: [publisherDrafts.publisherId],
    references: [publishers.id],
  }),
  website: one(websites, {
    fields: [publisherDrafts.websiteId],
    references: [websites.id],
  }),
}));

// Type exports
export type PublisherDraft = typeof publisherDrafts.$inferSelect;
export type NewPublisherDraft = typeof publisherDrafts.$inferInsert;