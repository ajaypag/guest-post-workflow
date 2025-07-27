import { pgTable, uuid, text, timestamp, integer, jsonb, varchar } from 'drizzle-orm/pg-core';

export const dataForSeoApiLogs = pgTable('dataforseo_api_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Request Info
  taskId: varchar('task_id', { length: 255 }),
  endpoint: text('endpoint').notNull(),
  requestPayload: jsonb('request_payload').notNull(),
  requestHeaders: jsonb('request_headers'),
  
  // Domain/Client Info
  domainId: uuid('domain_id').references(() => bulkAnalysisDomains.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  domain: varchar('domain', { length: 255 }),
  
  // Response Info
  responseStatus: integer('response_status'),
  responseData: jsonb('response_data'),
  errorMessage: text('error_message'),
  
  // Metadata
  cost: numeric('cost', { precision: 10, scale: 6 }),
  keywordCount: integer('keyword_count'),
  locationCode: integer('location_code'),
  languageCode: varchar('language_code', { length: 10 }),
  
  // Timestamps
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  respondedAt: timestamp('responded_at'),
  
  // Additional Context
  requestType: varchar('request_type', { length: 50 }), // 'single', 'batch', 'cache_check', etc.
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
});

// Import dependencies (these should already exist in your schema)
import { bulkAnalysisDomains } from './bulkAnalysisSchema';
import { clients } from './schema';
import { users } from './schema';
import { numeric } from 'drizzle-orm/pg-core';