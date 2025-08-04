import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  varchar, 
  boolean,
  jsonb,
  integer,
  pgEnum
} from 'drizzle-orm/pg-core';

// Enum for page types
export const pageTypeEnum = pgEnum('page_type', [
  'landing_page',
  'blog_post',
  'tool_page',
  'resource_page',
  'case_study',
  'other'
]);

// Enum for recreation status
export const recreationStatusEnum = pgEnum('recreation_status', [
  'identified',      // Found on Linkio, needs analysis
  'analyzed',        // Content/structure analyzed
  'in_progress',     // Being recreated
  'completed',       // Recreation done
  'published',       // Live on our site
  'skipped'         // Decided not to recreate
]);

// Main table for tracking Linkio pages
export const linkioPages = pgTable('linkio_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Original Linkio info
  originalUrl: text('original_url').notNull().unique(),
  originalTitle: text('original_title'),
  originalMetaDescription: text('original_meta_description'),
  
  // Page categorization
  pageType: pageTypeEnum('page_type').notNull().default('other'),
  category: varchar('category', { length: 100 }), // e.g., 'link-building', 'seo-tools'
  priority: integer('priority').default(0), // 0 = low, 1 = medium, 2 = high
  
  // Our recreation info
  recreationStatus: recreationStatusEnum('recreation_status').notNull().default('identified'),
  ourSlug: varchar('our_slug', { length: 255 }), // What URL we'll use
  ourTitle: text('our_title'),
  ourMetaDescription: text('our_meta_description'),
  
  // Content analysis
  contentStructure: jsonb('content_structure'), // JSON of headings, sections, etc.
  keyFeatures: jsonb('key_features'), // Main features/points to recreate
  wordCount: integer('word_count'),
  hasVideo: boolean('has_video').default(false),
  hasTools: boolean('has_tools').default(false),
  hasCta: boolean('has_cta').default(true),
  
  // Notes and metadata
  notes: text('notes'), // Any special considerations
  skipReason: text('skip_reason'), // If skipped, why?
  
  // Timestamps
  identifiedAt: timestamp('identified_at').defaultNow(),
  analyzedAt: timestamp('analyzed_at'),
  completedAt: timestamp('completed_at'),
  publishedAt: timestamp('published_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Table for tracking specific sections/components to recreate
export const linkioComponents = pgTable('linkio_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  pageId: uuid('page_id').references(() => linkioPages.id).notNull(),
  
  componentType: varchar('component_type', { length: 50 }).notNull(), // 'hero', 'features', 'pricing', 'faq', etc.
  componentName: varchar('component_name', { length: 255 }),
  originalContent: jsonb('original_content'), // Structured data about the component
  ourContent: jsonb('our_content'), // Our version
  
  isRecreated: boolean('is_recreated').default(false),
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Table for tracking assets (images, videos, etc.)
export const linkioAssets = pgTable('linkio_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  pageId: uuid('page_id').references(() => linkioPages.id).notNull(),
  
  assetType: varchar('asset_type', { length: 50 }).notNull(), // 'image', 'video', 'pdf', etc.
  originalUrl: text('original_url').notNull(),
  description: text('description'),
  altText: text('alt_text'),
  
  needsRecreation: boolean('needs_recreation').default(true),
  ourUrl: text('our_url'), // Where we stored our version
  
  createdAt: timestamp('created_at').defaultNow()
});

// Tracking blog categories from Linkio
export const linkioBlogCategories = pgTable('linkio_blog_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryName: varchar('category_name', { length: 100 }).notNull().unique(),
  categorySlug: varchar('category_slug', { length: 100 }).notNull().unique(),
  postCount: integer('post_count').default(0),
  description: text('description'),
  
  createdAt: timestamp('created_at').defaultNow()
});